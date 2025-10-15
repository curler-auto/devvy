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


# Add your routes to the router instead of directly to app
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