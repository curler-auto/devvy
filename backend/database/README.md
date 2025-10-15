# Database Abstraction Layer

This directory contains the database abstraction layer that enables the application to run in both **Web** and **Desktop** modes.

## Structure

```
database/
├── __init__.py           # Factory pattern & global instance
├── base.py               # Abstract interface (DatabaseBase)
├── mongodb.py            # MongoDB implementation (web mode)
├── sqlite.py             # SQLite implementation (desktop mode)
├── models_sqlite.py      # SQLAlchemy models for SQLite
└── README.md             # This file
```

## Quick Start

### Using in Your Code

```python
from db_service import get_db

# In any async function/endpoint:
async def my_function():
    db = await get_db()
    
    # Now use any database method:
    user = await db.get_user_by_email("user@example.com")
    collections = await db.get_collections(user['id'])
    # etc.
```

### Switching Modes

Just change the environment variable in `.env`:

```bash
# Web mode (MongoDB)
APP_MODE=web

# Desktop mode (SQLite)
APP_MODE=desktop
```

## Available Methods

All methods are defined in `base.py` and implemented in both `mongodb.py` and `sqlite.py`.

### User Operations
- `create_user(user_data)` - Create new user
- `get_user_by_email(email)` - Find user by email
- `get_user_by_id(user_id)` - Find user by ID

### Organization Operations
- `create_organization(org_data)` - Create organization
- `get_organization(org_id)` - Get organization by ID
- `get_organizations()` - List all organizations

### Tool Configuration
- `get_tool_configs()` - Get all tool configs
- `get_tool_config(tool_id)` - Get specific tool config
- `upsert_tool_config(tool_id, config_data)` - Create/update tool config

### Collections
- `create_collection(user_id, data)` - Create collection
- `get_collections(user_id)` - Get user's collections
- `delete_collection(collection_id, user_id)` - Delete collection

### Folders
- `create_folder(data)` - Create folder
- `get_folders(collection_id, user_id)` - Get folders in collection
- `get_folder(folder_id, user_id)` - Get specific folder
- `update_folder(folder_id, user_id, data)` - Update folder
- `delete_folder(folder_id, user_id)` - Delete folder

### Saved Items
- `create_saved_item(data)` - Save item
- `get_saved_items(collection_id, user_id)` - Get items in collection
- `get_saved_item(item_id, user_id)` - Get specific item
- `delete_saved_items_by_folder(folder_id, user_id)` - Delete folder's items
- `delete_saved_items_by_collection(collection_id, user_id)` - Delete collection's items

### Favorites
- `add_favorite(user_id, tool_id)` - Add favorite
- `remove_favorite(user_id, tool_id)` - Remove favorite
- `get_favorites(user_id)` - Get user's favorites

## Implementation Details

### MongoDB (mongodb.py)
- Uses Motor (async MongoDB driver)
- Directly wraps existing MongoDB operations
- No schema enforcement
- Best for: Multi-user web deployment

### SQLite (sqlite.py)
- Uses SQLAlchemy + aiosqlite
- Typed models with schema enforcement
- Better performance for single-user
- Best for: Desktop Electron app

## Adding New Methods

To add a new database operation:

1. Add abstract method to `base.py`:
```python
@abstractmethod
async def my_new_operation(self, param: str) -> Dict[str, Any]:
    pass
```

2. Implement in `mongodb.py`:
```python
async def my_new_operation(self, param: str) -> Dict[str, Any]:
    result = await self.db.my_collection.find_one({"param": param})
    return result
```

3. Implement in `sqlite.py`:
```python
async def my_new_operation(self, param: str) -> Dict[str, Any]:
    async with self.SessionLocal() as session:
        result = await session.execute(
            select(MyModel).where(MyModel.param == param)
        )
        model = result.scalar_one_or_none()
        return self._model_to_dict(model)
```

## Testing

```bash
# Test MongoDB mode
APP_MODE=web pytest test_database.py

# Test SQLite mode
APP_MODE=desktop pytest test_database.py
```

## Performance Notes

### MongoDB
- ✅ Better for: High concurrency, distributed systems
- ✅ Horizontal scaling
- ⚠️ Requires server running

### SQLite
- ✅ Better for: Single-user, local storage
- ✅ No server dependency
- ✅ Faster for small datasets
- ⚠️ Limited concurrency

## Troubleshooting

### "Database not initialized"
Make sure to call `await db_service.initialize()` before using the database.

### "Module not found: database"
The `database/` directory must have `__init__.py` and be in PYTHONPATH.

### SQLite file not created
Check `DATABASE_URL` in `.env` and ensure write permissions.

### MongoDB connection failed
Verify `MONGO_URL` is correct and MongoDB server is running.
