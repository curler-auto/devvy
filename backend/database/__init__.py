"""
Database factory - returns MongoDB or SQLite based on APP_MODE.
"""
import os
from .base import DatabaseBase
from .mongodb import MongoDBDatabase
from .sqlite import SQLiteDatabase


def get_database() -> DatabaseBase:
    """
    Factory function to get the appropriate database implementation.
    
    Returns:
        DatabaseBase: MongoDB for web mode, SQLite for desktop mode
    """
    app_mode = os.environ.get('APP_MODE', 'web').lower()
    
    if app_mode == 'desktop':
        # Desktop mode - use SQLite
        database_url = os.environ.get('DATABASE_URL', 'sqlite+aiosqlite:///./devtools.db')
        print(f"🖥️  Desktop Mode: Using SQLite database at {database_url}")
        return SQLiteDatabase(database_url)
    else:
        # Web mode - use MongoDB
        mongo_url = os.environ.get('MONGO_URL')
        db_name = os.environ.get('DB_NAME', 'devtools')
        print(f"🌐 Web Mode: Using MongoDB at {mongo_url}")
        return MongoDBDatabase(mongo_url, db_name)


# Global database instance
_db_instance = None


async def get_db_instance() -> DatabaseBase:
    """Get or create the global database instance."""
    global _db_instance
    if _db_instance is None:
        _db_instance = get_database()
        await _db_instance.connect()
    return _db_instance


async def close_db():
    """Close the database connection."""
    global _db_instance
    if _db_instance:
        await _db_instance.disconnect()
        _db_instance = None
