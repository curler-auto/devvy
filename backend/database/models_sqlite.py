"""
SQLAlchemy models for SQLite (desktop mode).
"""
from sqlalchemy import Column, String, Boolean, DateTime, Text, Integer, JSON
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime, timezone

Base = declarative_base()


class User(Base):
    __tablename__ = 'users'
    
    id = Column(String, primary_key=True)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    role = Column(String, default='user')
    license_type = Column(String, default='free')
    organization_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Organization(Base):
    __tablename__ = 'organizations'
    
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    license_count = Column(Integer, default=1)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class ToolConfig(Base):
    __tablename__ = 'tool_configs'
    
    tool_id = Column(String, primary_key=True)
    tool_name = Column(String, nullable=False)
    is_premium = Column(Boolean, default=False)
    description = Column(Text, default='')


class Collection(Base):
    __tablename__ = 'collections'
    
    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, default='')
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Folder(Base):
    __tablename__ = 'folders'
    
    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False, index=True)
    collection_id = Column(String, nullable=False, index=True)
    name = Column(String, nullable=False)
    parent_folder_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class SavedItem(Base):
    __tablename__ = 'saved_items'
    
    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False, index=True)
    collection_id = Column(String, nullable=False, index=True)
    folder_id = Column(String, nullable=True, index=True)
    name = Column(String, nullable=False)
    tool_id = Column(String, nullable=False)
    data = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Favorite(Base):
    __tablename__ = 'favorites'
    
    user_id = Column(String, primary_key=True)
    tool_id = Column(String, primary_key=True)
