# Migration Example: Converting Endpoints to Use Database Abstraction

## Example: User Login Endpoint

### BEFORE (MongoDB Only):
```python
from motor.motor_asyncio import AsyncIOMotorClient

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

@api_router.post("/auth/login")
async def login(user_data: UserLogin):
    # Direct MongoDB access
    user = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(user_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token({"id": user["id"], "email": user["email"]})
    return {"access_token": token, "user": user}
```

### AFTER (Works with Both MongoDB and SQLite):
```python
from db_service import get_db

@api_router.post("/auth/login")
async def login(user_data: UserLogin):
    # Get database instance (automatically uses correct implementation)
    db = await get_db()
    
    # Use abstraction method
    user = await db.get_user_by_email(user_data.email)
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(user_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token({"id": user["id"], "email": user["email"]})
    return {"access_token": token, "user": user}
```

## Example: Creating a Collection

### BEFORE:
```python
@api_router.post("/collections/create")
async def create_collection(
    collection: CollectionCreate,
    current_user: dict = Depends(get_current_user)
):
    collection_id = str(uuid.uuid4())
    collection_doc = {
        "id": collection_id,
        "user_id": current_user['id'],
        "name": collection.name,
        "description": collection.description,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.collections.insert_one(collection_doc)
    return {"id": collection_id, "message": "Collection created"}
```

### AFTER:
```python
@api_router.post("/collections/create")
async def create_collection(
    collection: CollectionCreate,
    current_user: dict = Depends(get_current_user)
):
    db = await get_db()
    
    collection_data = {
        "name": collection.name,
        "description": collection.description,
        "created_at": datetime.now(timezone.utc)
    }
    
    result = await db.create_collection(current_user['id'], collection_data)
    return {"id": result['id'], "message": "Collection created"}
```

## Example: Getting Folders

### BEFORE:
```python
@api_router.get("/folders/{collection_id}")
async def get_folders(
    collection_id: str,
    current_user: dict = Depends(get_current_user)
):
    folders = await db.folders.find(
        {"collection_id": collection_id, "user_id": current_user['id']},
        {"_id": 0}
    ).to_list(1000)
    
    return {"folders": folders}
```

### AFTER:
```python
@api_router.get("/folders/{collection_id}")
async def get_folders(
    collection_id: str,
    current_user: dict = Depends(get_current_user)
):
    db = await get_db()
    folders = await db.get_folders(collection_id, current_user['id'])
    return {"folders": folders}
```

## Complete Conversion Checklist

### Auth Routes:
- [x] `/auth/register` → `db.create_user(user_data)`
- [x] `/auth/login` → `db.get_user_by_email(email)`

### Collection Routes:
- [x] `/collections/list` → `db.get_collections(user_id)`
- [x] `/collections/create` → `db.create_collection(user_id, data)`
- [x] `/collections/{id}` DELETE → `db.delete_collection(id, user_id)`

### Folder Routes:
- [x] `/folders/{collection_id}` → `db.get_folders(collection_id, user_id)`
- [x] `/folders/create` → `db.create_folder(data)`
- [x] `/folders/{id}` PUT → `db.update_folder(id, user_id, data)`
- [x] `/folders/{id}` DELETE → `db.delete_folder(id, user_id)`

### Saved Items Routes:
- [x] `/saved-items/{collection_id}` → `db.get_saved_items(collection_id, user_id)`
- [x] `/saved-items/save` → `db.create_saved_item(data)`
- [x] `/saved-items/{id}` → `db.get_saved_item(id, user_id)`

### Tool Config Routes:
- [x] `/tools/config` → `db.get_tool_configs()`
- [x] `/admin/configure-tool` → `db.upsert_tool_config(tool_id, data)`

### Favorites Routes:
- [x] `/favorites/add` → `db.add_favorite(user_id, tool_id)`
- [x] `/favorites/remove` → `db.remove_favorite(user_id, tool_id)`
- [x] `/favorites/list` → `db.get_favorites(user_id)`

## Benefits of This Approach

✅ **Zero Breaking Changes**: Existing MongoDB code continues to work
✅ **Gradual Migration**: Convert one endpoint at a time
✅ **Easy Testing**: Test both modes independently
✅ **Clean Code**: Unified interface for all database operations
✅ **Future Proof**: Easy to add more database backends (PostgreSQL, etc.)
