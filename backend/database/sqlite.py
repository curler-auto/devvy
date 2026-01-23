"""
SQLite implementation for desktop app mode.
"""

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, delete, update
from typing import List, Optional, Dict, Any
from .base import DatabaseBase
from .models_sqlite import (
    Base,
    User,
    Organization,
    ToolConfig,
    Collection,
    Folder,
    SavedItem,
    Favorite,
)
import uuid
from datetime import datetime


class SQLiteDatabase(DatabaseBase):
    def __init__(self, database_url: str):
        self.database_url = database_url
        self.engine = None
        self.SessionLocal = None

    async def connect(self):
        """Initialize SQLite connection"""
        self.engine = create_async_engine(self.database_url, echo=False)
        self.SessionLocal = sessionmaker(
            self.engine, class_=AsyncSession, expire_on_commit=False
        )

        # Create tables
        async with self.engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    async def disconnect(self):
        """Close SQLite connection"""
        if self.engine:
            await self.engine.dispose()

    def _model_to_dict(self, model) -> Dict[str, Any]:
        """Convert SQLAlchemy model to dictionary"""
        if model is None:
            return None
        result = {}
        for column in model.__table__.columns:
            value = getattr(model, column.name)
            if isinstance(value, datetime):
                result[column.name] = value.isoformat()
            else:
                result[column.name] = value
        return result

    # User operations
    async def create_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        async with self.SessionLocal() as session:
            user = User(**user_data)
            session.add(user)
            await session.commit()
            await session.refresh(user)
            return self._model_to_dict(user)

    async def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        async with self.SessionLocal() as session:
            result = await session.execute(
                select(User).where(User.email == email)
            )
            user = result.scalar_one_or_none()
            return self._model_to_dict(user) if user else None

    async def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        async with self.SessionLocal() as session:
            user = await session.get(User, user_id)
            return self._model_to_dict(user) if user else None

    # Organization operations
    async def create_organization(
        self, org_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        async with self.SessionLocal() as session:
            org = Organization(**org_data)
            session.add(org)
            await session.commit()
            await session.refresh(org)
            return self._model_to_dict(org)

    async def get_organization(self, org_id: str) -> Optional[Dict[str, Any]]:
        async with self.SessionLocal() as session:
            org = await session.get(Organization, org_id)
            return self._model_to_dict(org) if org else None

    async def get_organizations(self) -> List[Dict[str, Any]]:
        async with self.SessionLocal() as session:
            result = await session.execute(select(Organization))
            orgs = result.scalars().all()
            return [self._model_to_dict(org) for org in orgs]

    # Tool configuration operations
    async def get_tool_configs(self) -> List[Dict[str, Any]]:
        async with self.SessionLocal() as session:
            result = await session.execute(select(ToolConfig))
            configs = result.scalars().all()
            return [self._model_to_dict(config) for config in configs]

    async def get_tool_config(self, tool_id: str) -> Optional[Dict[str, Any]]:
        async with self.SessionLocal() as session:
            config = await session.get(ToolConfig, tool_id)
            return self._model_to_dict(config) if config else None

    async def upsert_tool_config(
        self, tool_id: str, config_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        async with self.SessionLocal() as session:
            config = await session.get(ToolConfig, tool_id)
            if config:
                for key, value in config_data.items():
                    setattr(config, key, value)
            else:
                # Handle case where tool_id might be in config_data
                clean_data = {
                    k: v for k, v in config_data.items() if k != "tool_id"
                }
                config = ToolConfig(tool_id=tool_id, **clean_data)
                session.add(config)
            await session.commit()
            await session.refresh(config)
            return self._model_to_dict(config)

    async def upsert_tool_configs(
        self, configs: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Bulk upsert tool configurations for performance.
        Prevents N+1 database round-trips by using a single transaction.
        """
        async with self.SessionLocal() as session:
            if not configs:
                return []

            # Get all tool IDs
            tool_ids = [c.get("tool_id") for c in configs if c.get("tool_id")]
            if not tool_ids:
                return []

            # Fetch existing configs in one query
            result = await session.execute(
                select(ToolConfig).where(ToolConfig.tool_id.in_(tool_ids))
            )
            existing_configs = {c.tool_id: c for c in result.scalars().all()}

            results = []
            new_configs = []

            for config_data in configs:
                tool_id = config_data.get("tool_id")
                if not tool_id:
                    continue

                if tool_id in existing_configs:
                    config = existing_configs[tool_id]
                    for key, value in config_data.items():
                        setattr(config, key, value)
                else:
                    # Handle case where tool_id might be in config_data
                    clean_data = {
                        k: v for k, v in config_data.items() if k != "tool_id"
                    }
                    config = ToolConfig(tool_id=tool_id, **clean_data)
                    new_configs.append(config)
                    # Add to map in case duplicate IDs in input list
                    existing_configs[tool_id] = config
                results.append(config)

            if new_configs:
                session.add_all(new_configs)

            await session.commit()
            return [self._model_to_dict(config) for config in results]

    # Collection operations
    async def create_collection(
        self, user_id: str, collection_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        async with self.SessionLocal() as session:
            if "id" not in collection_data:
                collection_data["id"] = str(uuid.uuid4())
            collection_data["user_id"] = user_id
            collection = Collection(**collection_data)
            session.add(collection)
            await session.commit()
            await session.refresh(collection)
            return self._model_to_dict(collection)

    async def get_collections(self, user_id: str) -> List[Dict[str, Any]]:
        async with self.SessionLocal() as session:
            result = await session.execute(
                select(Collection).where(Collection.user_id == user_id)
            )
            collections = result.scalars().all()
            return [self._model_to_dict(c) for c in collections]

    async def update_collection(
        self, collection_id: str, user_id: str, update_data: Dict[str, Any]
    ) -> bool:
        async with self.SessionLocal() as session:
            result = await session.execute(
                select(Collection).where(
                    Collection.id == collection_id,
                    Collection.user_id == user_id,
                )
            )
            collection = result.scalar_one_or_none()

            if not collection:
                return False

            for key, value in update_data.items():
                if hasattr(collection, key):
                    setattr(collection, key, value)

            await session.commit()
            return True

    async def delete_collection(
        self, collection_id: str, user_id: str
    ) -> bool:
        async with self.SessionLocal() as session:
            result = await session.execute(
                delete(Collection).where(
                    Collection.id == collection_id,
                    Collection.user_id == user_id,
                )
            )
            await session.commit()
            return result.rowcount > 0

    # Folder operations
    async def create_folder(
        self, folder_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        async with self.SessionLocal() as session:
            if "id" not in folder_data:
                folder_data["id"] = str(uuid.uuid4())
            folder = Folder(**folder_data)
            session.add(folder)
            await session.commit()
            await session.refresh(folder)
            return self._model_to_dict(folder)

    async def get_folders(
        self, collection_id: str, user_id: str
    ) -> List[Dict[str, Any]]:
        async with self.SessionLocal() as session:
            result = await session.execute(
                select(Folder).where(
                    Folder.collection_id == collection_id,
                    Folder.user_id == user_id,
                )
            )
            folders = result.scalars().all()
            return [self._model_to_dict(f) for f in folders]

    async def update_folder(
        self, folder_id: str, user_id: str, update_data: Dict[str, Any]
    ) -> bool:
        async with self.SessionLocal() as session:
            result = await session.execute(
                update(Folder)
                .where(Folder.id == folder_id, Folder.user_id == user_id)
                .values(**update_data)
            )
            await session.commit()
            return result.rowcount > 0

    async def delete_folder(self, folder_id: str, user_id: str) -> bool:
        async with self.SessionLocal() as session:
            result = await session.execute(
                delete(Folder).where(
                    Folder.id == folder_id, Folder.user_id == user_id
                )
            )
            await session.commit()
            return result.rowcount > 0

    async def get_folder(
        self, folder_id: str, user_id: str
    ) -> Optional[Dict[str, Any]]:
        async with self.SessionLocal() as session:
            result = await session.execute(
                select(Folder).where(
                    Folder.id == folder_id, Folder.user_id == user_id
                )
            )
            folder = result.scalar_one_or_none()
            return self._model_to_dict(folder) if folder else None

    # Saved items operations
    async def create_saved_item(
        self, item_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        async with self.SessionLocal() as session:
            if "id" not in item_data:
                item_data["id"] = str(uuid.uuid4())
            item = SavedItem(**item_data)
            session.add(item)
            await session.commit()
            await session.refresh(item)
            return self._model_to_dict(item)

    async def create_saved_items_bulk(
        self, items_data: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Create multiple saved items in a single transaction"""
        async with self.SessionLocal() as session:
            items = []
            for data in items_data:
                if "id" not in data:
                    data["id"] = str(uuid.uuid4())
                items.append(SavedItem(**data))

            session.add_all(items)
            await session.commit()
            # No refresh needed as we set all IDs and other fields are provided
            # or defaults (timestamp is default but for bulk import slightly
            # inaccurate timestamp is acceptable or we could set it explicitly
            # if needed)

            return [self._model_to_dict(item) for item in items]

    async def get_saved_items(
        self, collection_id: str, user_id: str
    ) -> List[Dict[str, Any]]:
        async with self.SessionLocal() as session:
            result = await session.execute(
                select(SavedItem).where(
                    SavedItem.collection_id == collection_id,
                    SavedItem.user_id == user_id,
                )
            )
            items = result.scalars().all()
            return [self._model_to_dict(i) for i in items]

    async def get_saved_item(
        self, item_id: str, user_id: str
    ) -> Optional[Dict[str, Any]]:
        async with self.SessionLocal() as session:
            result = await session.execute(
                select(SavedItem).where(
                    SavedItem.id == item_id, SavedItem.user_id == user_id
                )
            )
            item = result.scalar_one_or_none()
            return self._model_to_dict(item) if item else None

    async def update_saved_item(
        self, item_id: str, user_id: str, updates: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        async with self.SessionLocal() as session:
            result = await session.execute(
                select(SavedItem).where(
                    SavedItem.id == item_id, SavedItem.user_id == user_id
                )
            )
            item = result.scalar_one_or_none()
            if not item:
                return None

            # Update fields
            for key, value in updates.items():
                if hasattr(item, key):
                    setattr(item, key, value)

            await session.commit()
            await session.refresh(item)
            return self._model_to_dict(item)

    async def delete_saved_item(self, item_id: str, user_id: str) -> bool:
        async with self.SessionLocal() as session:
            result = await session.execute(
                delete(SavedItem).where(
                    SavedItem.id == item_id, SavedItem.user_id == user_id
                )
            )
            await session.commit()
            return result.rowcount > 0

    async def delete_saved_items_by_folder(
        self, folder_id: str, user_id: str
    ) -> int:
        async with self.SessionLocal() as session:
            result = await session.execute(
                delete(SavedItem).where(
                    SavedItem.folder_id == folder_id,
                    SavedItem.user_id == user_id,
                )
            )
            await session.commit()
            return result.rowcount

    async def delete_saved_items_by_collection(
        self, collection_id: str, user_id: str
    ) -> int:
        async with self.SessionLocal() as session:
            result = await session.execute(
                delete(SavedItem).where(
                    SavedItem.collection_id == collection_id,
                    SavedItem.user_id == user_id,
                )
            )
            await session.commit()
            return result.rowcount

    # Favorites operations
    async def add_favorite(
        self, user_id: str, tool_id: str
    ) -> Dict[str, Any]:
        async with self.SessionLocal() as session:
            favorite = Favorite(user_id=user_id, tool_id=tool_id)
            session.add(favorite)
            await session.commit()
            return {"user_id": user_id, "tool_id": tool_id}

    async def remove_favorite(self, user_id: str, tool_id: str) -> bool:
        async with self.SessionLocal() as session:
            result = await session.execute(
                delete(Favorite).where(
                    Favorite.user_id == user_id, Favorite.tool_id == tool_id
                )
            )
            await session.commit()
            return result.rowcount > 0

    async def get_favorites(self, user_id: str) -> List[str]:
        async with self.SessionLocal() as session:
            result = await session.execute(
                select(Favorite.tool_id).where(Favorite.user_id == user_id)
            )
            return [tool_id for (tool_id,) in result.all()]
