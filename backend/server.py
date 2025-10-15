from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import json
from auth import (
    User, UserCreate, UserLogin, Token, Organization, OrganizationCreate,
    ToolConfig, ToolConfigUpdate, get_password_hash, verify_password,
    create_access_token, decode_token
)


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# Dependency to get current user from JWT token
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    token = credentials.credentials
    payload = decode_token(token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user = await db.users.find_one({"id": payload.get("sub")}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user

# Dependency to check if user is admin
async def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user.get("role") not in ["admin", "org_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")  # Ignore MongoDB's _id field
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str


class JSONBeautifyRequest(BaseModel):
    json_string: str
    indent: int = 2

class JSONBeautifyResponse(BaseModel):
    beautified: str
    valid: bool
    error: Optional[str] = None


class FavoriteToolRequest(BaseModel):
    tool_id: str
    user_id: str = "default_user"  # For now, using a default user

class FavoriteTool(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tool_id: str
    user_id: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ========== AUTHENTICATION ROUTES ==========

@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # If no organization_id provided, create free tier single-user org
    org_id = user_data.organization_id
    if not org_id:
        free_org = Organization(
            name=f"{user_data.email}'s Workspace",
            license_tier="free",
            max_licenses=1,
            active_licenses=1
        )
        org_doc = free_org.model_dump()
        org_doc['created_at'] = org_doc['created_at'].isoformat()
        await db.organizations.insert_one(org_doc)
        org_id = free_org.id
    else:
        # Check if organization exists and has available licenses
        org = await db.organizations.find_one({"id": org_id}, {"_id": 0})
        if not org:
            raise HTTPException(status_code=404, detail="Organization not found")
        if org['active_licenses'] >= org['max_licenses']:
            raise HTTPException(status_code=400, detail="No available licenses in organization")
        
        # Increment active licenses
        await db.organizations.update_one(
            {"id": org_id},
            {"$inc": {"active_licenses": 1}}
        )
    
    # Create user
    user = User(
        email=user_data.email,
        role=user_data.role,
        organization_id=org_id
    )
    
    user_doc = user.model_dump()
    user_doc['password_hash'] = get_password_hash(user_data.password)
    user_doc['created_at'] = user_doc['created_at'].isoformat()
    
    await db.users.insert_one(user_doc)
    
    # Create access token
    access_token = create_access_token(data={"sub": user.id, "email": user.email})
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user={
            "id": user.id,
            "email": user.email,
            "role": user.role,
            "organization_id": user.organization_id
        }
    )

@api_router.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not verify_password(credentials.password, user['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not user.get('is_active', True):
        raise HTTPException(status_code=403, detail="User account is disabled")
    
    # Create access token
    access_token = create_access_token(data={"sub": user['id'], "email": user['email']})
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user={
            "id": user['id'],
            "email": user['email'],
            "role": user.get('role', 'user'),
            "organization_id": user.get('organization_id')
        }
    )

@api_router.get("/auth/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    # Get organization info
    org = await db.organizations.find_one({"id": current_user.get('organization_id')}, {"_id": 0})
    
    return {
        "user": {
            "id": current_user['id'],
            "email": current_user['email'],
            "role": current_user.get('role', 'user')
        },
        "organization": org if org else None
    }


# ========== LICENSE MANAGEMENT ROUTES ==========

@api_router.get("/license/validate")
async def validate_license(current_user: dict = Depends(get_current_user)):
    """Validate if user has access to premium tools"""
    org = await db.organizations.find_one({"id": current_user.get('organization_id')}, {"_id": 0})
    
    if not org:
        return {
            "is_premium": False,
            "license_tier": "free",
            "message": "No organization found"
        }
    
    # Check if license is expired
    is_expired = False
    if org.get('expiry_date'):
        expiry = datetime.fromisoformat(org['expiry_date']) if isinstance(org['expiry_date'], str) else org['expiry_date']
        if expiry < datetime.now(timezone.utc):
            is_expired = True
    
    return {
        "is_premium": org['license_tier'] == 'premium' and not is_expired,
        "license_tier": org['license_tier'],
        "organization_name": org['name'],
        "licenses_used": org.get('active_licenses', 0),
        "licenses_total": org.get('max_licenses', 1),
        "expiry_date": org.get('expiry_date'),
        "is_expired": is_expired
    }

@api_router.get("/tools/config")
async def get_tools_config():
    """Get configuration of which tools are free/premium"""
    configs = await db.tool_configs.find({}, {"_id": 0}).to_list(100)
    
    # If no config exists, create default (all free)
    if not configs:
        default_tools = [
            {"tool_id": "json-beautifier", "tool_name": "JSON Beautifier", "is_premium": False},
            {"tool_id": "json-validator", "tool_name": "JSON Validator", "is_premium": False},
            {"tool_id": "api-tester", "tool_name": "API Tester", "is_premium": True},
        ]
        
        for tool_data in default_tools:
            tool_config = ToolConfig(**tool_data)
            doc = tool_config.model_dump()
            await db.tool_configs.insert_one(doc)
        
        configs = await db.tool_configs.find({}, {"_id": 0}).to_list(100)
    
    return {"tools": configs}

@api_router.get("/tools/check-access/{tool_id}")
async def check_tool_access(tool_id: str, current_user: dict = Depends(get_current_user)):
    """Check if user has access to a specific tool"""
    # Get tool config
    tool_config = await db.tool_configs.find_one({"tool_id": tool_id}, {"_id": 0})
    
    if not tool_config:
        # If no config, assume free
        return {"has_access": True, "is_premium_tool": False}
    
    if not tool_config.get('is_premium', False):
        # Free tool, everyone has access
        return {"has_access": True, "is_premium_tool": False}
    
    # Premium tool - check license
    license_info = await validate_license(current_user)
    
    return {
        "has_access": license_info['is_premium'],
        "is_premium_tool": True,
        "license_tier": license_info['license_tier']
    }


# ========== ADMIN ROUTES ==========

@api_router.post("/admin/configure-tool")
async def configure_tool(config: ToolConfigUpdate, admin_user: dict = Depends(require_admin)):
    """Set a tool as free or premium (admin only)"""
    existing = await db.tool_configs.find_one({"tool_id": config.tool_id}, {"_id": 0})
    
    if existing:
        await db.tool_configs.update_one(
            {"tool_id": config.tool_id},
            {"$set": {"is_premium": config.is_premium}}
        )
        message = "Tool configuration updated"
    else:
        tool_config = ToolConfig(
            tool_id=config.tool_id,
            tool_name=config.tool_id.replace('-', ' ').title(),
            is_premium=config.is_premium
        )
        await db.tool_configs.insert_one(tool_config.model_dump())
        message = "Tool configuration created"
    
    return {"message": message, "tool_id": config.tool_id, "is_premium": config.is_premium}

@api_router.get("/admin/tools-config")
async def get_admin_tools_config(admin_user: dict = Depends(require_admin)):
    """Get all tool configurations (admin only)"""
    configs = await db.tool_configs.find({}, {"_id": 0}).to_list(100)
    return {"tools": configs}

@api_router.post("/admin/create-organization")
async def create_organization(org_data: OrganizationCreate, admin_user: dict = Depends(require_admin)):
    """Create a new organization with licenses (admin only)"""
    # Check if admin email already exists
    existing_user = await db.users.find_one({"email": org_data.admin_email}, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=400, detail="Admin email already registered")
    
    # Create organization
    org = Organization(
        name=org_data.name,
        license_tier=org_data.license_tier,
        max_licenses=org_data.max_licenses,
        active_licenses=1,  # Admin counts as first license
        expiry_date=datetime.now(timezone.utc) + timedelta(days=365) if org_data.license_tier == 'premium' else None
    )
    
    org_doc = org.model_dump()
    org_doc['created_at'] = org_doc['created_at'].isoformat()
    if org_doc.get('expiry_date'):
        org_doc['expiry_date'] = org_doc['expiry_date'].isoformat()
    
    await db.organizations.insert_one(org_doc)
    
    # Create admin user
    admin_user_data = UserCreate(
        email=org_data.admin_email,
        password=org_data.admin_password,
        role="org_admin",
        organization_id=org.id
    )
    
    user = User(
        email=admin_user_data.email,
        role="org_admin",
        organization_id=org.id
    )
    
    user_doc = user.model_dump()
    user_doc['password_hash'] = get_password_hash(org_data.admin_password)
    user_doc['created_at'] = user_doc['created_at'].isoformat()
    
    await db.users.insert_one(user_doc)
    
    return {
        "message": "Organization created successfully",
        "organization": {
            "id": org.id,
            "name": org.name,
            "license_key": org.license_key,
            "license_tier": org.license_tier,
            "max_licenses": org.max_licenses
        },
        "admin_user": {
            "id": user.id,
            "email": user.email
        }
    }

@api_router.get("/admin/organizations")
async def list_organizations(admin_user: dict = Depends(require_admin)):
    """List all organizations (admin only)"""
    orgs = await db.organizations.find({}, {"_id": 0}).to_list(1000)
    return {"organizations": orgs}

@api_router.get("/admin/organization/{org_id}/users")
async def list_organization_users(org_id: str, admin_user: dict = Depends(require_admin)):
    """List all users in an organization (admin only)"""
    users = await db.users.find(
        {"organization_id": org_id},
        {"_id": 0, "password_hash": 0}
    ).to_list(1000)
    
    return {"users": users}


# ========== ORIGINAL ROUTES ==========

@api_router.get("/")
async def root():
    return {"message": "Developer Productivity Suite API"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    # Exclude MongoDB's _id field from the query results
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    # Convert ISO string timestamps back to datetime objects
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks


# JSON Beautifier Tool
@api_router.post("/tools/json-beautifier", response_model=JSONBeautifyResponse)
async def beautify_json(request: JSONBeautifyRequest):
    try:
        # Parse JSON to validate
        parsed = json.loads(request.json_string)
        
        # Beautify with specified indent
        beautified = json.dumps(parsed, indent=request.indent, sort_keys=False)
        
        return JSONBeautifyResponse(
            beautified=beautified,
            valid=True,
            error=None
        )
    except json.JSONDecodeError as e:
        return JSONBeautifyResponse(
            beautified=request.json_string,
            valid=False,
            error=f"Invalid JSON: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Favorites Management
@api_router.post("/favorites/add")
async def add_favorite(request: FavoriteToolRequest):
    # Check if already exists
    existing = await db.favorites.find_one({
        "tool_id": request.tool_id,
        "user_id": request.user_id
    }, {"_id": 0})
    
    if existing:
        return {"message": "Already in favorites", "favorite_id": existing["id"]}
    
    favorite = FavoriteTool(**request.model_dump())
    doc = favorite.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    await db.favorites.insert_one(doc)
    return {"message": "Added to favorites", "favorite_id": favorite.id}

@api_router.post("/favorites/remove")
async def remove_favorite(request: FavoriteToolRequest):
    result = await db.favorites.delete_one({
        "tool_id": request.tool_id,
        "user_id": request.user_id
    })
    
    if result.deleted_count > 0:
        return {"message": "Removed from favorites"}
    else:
        return {"message": "Not found in favorites"}

@api_router.get("/favorites/list")
async def list_favorites(user_id: str = "default_user"):
    favorites = await db.favorites.find(
        {"user_id": user_id},
        {"_id": 0}
    ).to_list(1000)
    
    return {"favorites": [fav["tool_id"] for fav in favorites]}


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()