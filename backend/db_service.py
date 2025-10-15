"""
Database service layer - provides high-level database operations
using the abstraction layer (works with both MongoDB and SQLite).
"""
from database import get_db_instance


class DBService:
    """Singleton database service"""
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance.db = None
        return cls._instance
    
    async def initialize(self):
        """Initialize the database connection"""
        if self.db is None:
            self.db = await get_db_instance()
    
    async def close(self):
        """Close the database connection"""
        from database import close_db
        await close_db()
        self.db = None


# Global service instance
db_service = DBService()


# Convenience function to get DB
async def get_db():
    """Get the database instance"""
    await db_service.initialize()
    return db_service.db
