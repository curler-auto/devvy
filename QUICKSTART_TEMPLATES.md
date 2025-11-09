# Quick Start Templates & Code Snippets

## 1. Project Structure

```
subscription-platform/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                 # FastAPI app
│   │   ├── config.py               # Configuration
│   │   ├── database.py             # DB connection
│   │   ├── models/                 # SQLAlchemy models
│   │   │   ├── user.py
│   │   │   ├── vendor.py
│   │   │   ├── subscription.py
│   │   │   └── payment.py
│   │   ├── schemas/                # Pydantic schemas
│   │   │   ├── user.py
│   │   │   ├── vendor.py
│   │   │   └── subscription.py
│   │   ├── api/                    # API routes
│   │   │   ├── auth.py
│   │   │   ├── users.py
│   │   │   ├── vendors.py
│   │   │   ├── plans.py
│   │   │   ├── subscriptions.py
│   │   │   └── payments.py
│   │   ├── services/               # Business logic
│   │   │   ├── auth_service.py
│   │   │   ├── subscription_service.py
│   │   │   ├── payment_service.py
│   │   │   └── notification_service.py
│   │   ├── utils/                  # Utilities
│   │   │   ├── security.py
│   │   │   ├── email.py
│   │   │   └── sms.py
│   │   └── tasks/                  # Celery tasks
│   │       ├── subscription_tasks.py
│   │       └── notification_tasks.py
│   ├── alembic/                    # DB migrations
│   ├── tests/
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── public/
│   │   ├── manifest.json
│   │   └── icons/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── pages/
│   │   ├── components/
│   │   ├── stores/
│   │   ├── hooks/
│   │   ├── utils/
│   │   └── styles/
│   ├── package.json
│   ├── vite.config.js
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## 2. Backend Templates

### config.py
```python
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # App
    APP_NAME: str = "SubHub"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # Database
    DATABASE_URL: str
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Payment
    RAZORPAY_KEY_ID: str
    RAZORPAY_KEY_SECRET: str
    
    # Email
    AWS_SES_REGION: str = "us-east-1"
    AWS_ACCESS_KEY_ID: str
    AWS_SECRET_ACCESS_KEY: str
    FROM_EMAIL: str
    
    # SMS
    TWILIO_ACCOUNT_SID: str
    TWILIO_AUTH_TOKEN: str
    TWILIO_PHONE_NUMBER: str
    
    # Storage
    AWS_S3_BUCKET: str
    
    class Config:
        env_file = ".env"

@lru_cache()
def get_settings():
    return Settings()
```

### database.py
```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import get_settings

settings = get_settings()

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

### models/user.py
```python
from sqlalchemy import Column, String, Boolean, DateTime, Enum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
import uuid
import enum

from app.database import Base

class UserRole(str, enum.Enum):
    USER = "user"
    VENDOR = "vendor"
    ADMIN = "admin"

class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone = Column(String(20), unique=True, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255))
    avatar_url = Column(String)
    role = Column(Enum(UserRole), default=UserRole.USER, index=True)
    email_verified = Column(Boolean, default=False)
    phone_verified = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    metadata = Column(JSONB, default={})
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login_at = Column(DateTime(timezone=True))
```

### schemas/user.py
```python
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from uuid import UUID

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    phone: Optional[str] = None

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: UUID
    role: str
    email_verified: bool
    phone_verified: bool
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
```

### api/auth.py
```python
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta

from app.database import get_db
from app.schemas.user import UserCreate, UserLogin, UserResponse, Token
from app.services.auth_service import AuthService
from app.utils.security import verify_token

router = APIRouter(prefix="/auth", tags=["Authentication"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    auth_service = AuthService(db)
    return await auth_service.register_user(user_data)

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    auth_service = AuthService(db)
    return await auth_service.login(form_data.username, form_data.password)

@router.post("/refresh", response_model=Token)
async def refresh_token(refresh_token: str, db: Session = Depends(get_db)):
    auth_service = AuthService(db)
    return await auth_service.refresh_access_token(refresh_token)

@router.get("/me", response_model=UserResponse)
async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    payload = verify_token(token)
    user_id = payload.get("sub")
    auth_service = AuthService(db)
    return await auth_service.get_user_by_id(user_id)
```

### services/auth_service.py
```python
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from datetime import datetime, timedelta
from jose import jwt
from passlib.context import CryptContext

from app.models.user import User
from app.schemas.user import UserCreate, Token
from app.config import get_settings

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class AuthService:
    def __init__(self, db: Session):
        self.db = db
    
    def hash_password(self, password: str) -> str:
        return pwd_context.hash(password)
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        return pwd_context.verify(plain_password, hashed_password)
    
    def create_access_token(self, data: dict) -> str:
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire, "type": "access"})
        return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    
    def create_refresh_token(self, data: dict) -> str:
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        to_encode.update({"exp": expire, "type": "refresh"})
        return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    
    async def register_user(self, user_data: UserCreate) -> User:
        # Check if user exists
        existing_user = self.db.query(User).filter(User.email == user_data.email).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Create user
        user = User(
            email=user_data.email,
            phone=user_data.phone,
            full_name=user_data.full_name,
            password_hash=self.hash_password(user_data.password)
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        
        # TODO: Send verification email
        
        return user
    
    async def login(self, email: str, password: str) -> Token:
        user = self.db.query(User).filter(User.email == email).first()
        if not user or not self.verify_password(password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        if not user.is_active:
            raise HTTPException(status_code=403, detail="Account is inactive")
        
        # Update last login
        user.last_login_at = datetime.utcnow()
        self.db.commit()
        
        # Create tokens
        access_token = self.create_access_token({"sub": str(user.id), "role": user.role})
        refresh_token = self.create_refresh_token({"sub": str(user.id)})
        
        return Token(access_token=access_token, refresh_token=refresh_token)
```

### main.py
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.api import auth, users, vendors, plans, subscriptions, payments

settings = get_settings()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(vendors.router, prefix="/api/v1")
app.include_router(plans.router, prefix="/api/v1")
app.include_router(subscriptions.router, prefix="/api/v1")
app.include_router(payments.router, prefix="/api/v1")

@app.get("/")
async def root():
    return {"message": f"Welcome to {settings.APP_NAME} API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
```

---

## 3. Frontend Templates

### stores/authStore.js
```javascript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      setAuth: (user, accessToken, refreshToken) => {
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
        });
      },

      updateUser: (userData) => {
        set({ user: { ...get().user, ...userData } });
      },

      logout: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
```

### utils/api.js
```javascript
import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const { accessToken } = useAuthStore.getState();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retried, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const { refreshToken } = useAuthStore.getState();
        const response = await axios.post(
          `${api.defaults.baseURL}/auth/refresh`,
          { refresh_token: refreshToken }
        );

        const { access_token, refresh_token } = response.data;
        useAuthStore.getState().setAuth(
          useAuthStore.getState().user,
          access_token,
          refresh_token
        );

        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

### hooks/useSubscriptions.js
```javascript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import toast from 'react-hot-toast';

export const useSubscriptions = () => {
  const queryClient = useQueryClient();

  // Get user subscriptions
  const { data: subscriptions, isLoading } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: async () => {
      const response = await api.get('/users/me/subscriptions');
      return response.data;
    },
  });

  // Subscribe to plan
  const subscribeMutation = useMutation({
    mutationFn: async (planData) => {
      const response = await api.post('/subscriptions', planData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['subscriptions']);
      toast.success('Subscription created successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to subscribe');
    },
  });

  // Pause subscription
  const pauseMutation = useMutation({
    mutationFn: async ({ subscriptionId, pauseData }) => {
      const response = await api.put(
        `/subscriptions/${subscriptionId}/pause`,
        pauseData
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['subscriptions']);
      toast.success('Subscription paused');
    },
  });

  // Cancel subscription
  const cancelMutation = useMutation({
    mutationFn: async (subscriptionId) => {
      const response = await api.put(`/subscriptions/${subscriptionId}/cancel`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['subscriptions']);
      toast.success('Subscription cancelled');
    },
  });

  return {
    subscriptions,
    isLoading,
    subscribe: subscribeMutation.mutate,
    pause: pauseMutation.mutate,
    cancel: cancelMutation.mutate,
  };
};
```

### components/subscription/SubscriptionCard.jsx
```javascript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Package, Pause, X } from 'lucide-react';

export const SubscriptionCard = ({ subscription, onPause, onCancel }) => {
  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-green-500',
      paused: 'bg-yellow-500',
      cancelled: 'bg-red-500',
      trial: 'bg-blue-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <img
              src={subscription.vendor.logo_url}
              alt={subscription.vendor.business_name}
              className="w-12 h-12 rounded-lg object-cover"
            />
            <div>
              <CardTitle className="text-lg">
                {subscription.plan.name}
              </CardTitle>
              <p className="text-sm text-gray-500">
                {subscription.vendor.business_name}
              </p>
            </div>
          </div>
          <Badge className={getStatusColor(subscription.status)}>
            {subscription.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Package className="w-4 h-4 text-gray-500" />
            <span>₹{subscription.price} / {subscription.billing_cycle}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span>Next billing: {new Date(subscription.next_billing_date).toLocaleDateString()}</span>
          </div>
          
          {subscription.status === 'active' && (
            <div className="flex gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPause(subscription.id)}
                className="flex-1"
              >
                <Pause className="w-4 h-4 mr-2" />
                Pause
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onCancel(subscription.id)}
                className="flex-1"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
```

### pages/Subscriptions/MySubscriptionsPage.jsx
```javascript
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { SubscriptionCard } from '@/components/subscription/SubscriptionCard';
import { Loader2 } from 'lucide-react';

export const MySubscriptionsPage = () => {
  const { subscriptions, isLoading, pause, cancel } = useSubscriptions();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">My Subscriptions</h1>
      
      {subscriptions?.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No active subscriptions</p>
          <Button onClick={() => navigate('/browse')}>
            Browse Plans
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subscriptions?.map((subscription) => (
            <SubscriptionCard
              key={subscription.id}
              subscription={subscription}
              onPause={pause}
              onCancel={cancel}
            />
          ))}
        </div>
      )}
    </div>
  );
};
```

---

## 4. Docker Setup

### docker-compose.yml
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: subhub
      POSTGRES_USER: subhub
      POSTGRES_PASSWORD: subhub123
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  backend:
    build: ./backend
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    volumes:
      - ./backend:/app
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql://subhub:subhub123@postgres:5432/subhub
      REDIS_URL: redis://redis:6379/0
    depends_on:
      - postgres
      - redis

  celery:
    build: ./backend
    command: celery -A app.tasks worker --loglevel=info
    volumes:
      - ./backend:/app
    environment:
      DATABASE_URL: postgresql://subhub:subhub123@postgres:5432/subhub
      REDIS_URL: redis://redis:6379/0
    depends_on:
      - postgres
      - redis

  frontend:
    build: ./frontend
    command: npm run dev -- --host
    volumes:
      - ./frontend:/app
      - /app/node_modules
    ports:
      - "5173:5173"
    environment:
      VITE_API_URL: http://localhost:8000/api/v1

volumes:
  postgres_data:
  redis_data:
```

### backend/Dockerfile
```dockerfile
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### frontend/Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]
```

---

## 5. Quick Commands

```bash
# Start development environment
docker-compose up -d

# Run database migrations
docker-compose exec backend alembic upgrade head

# Create new migration
docker-compose exec backend alembic revision --autogenerate -m "description"

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Run tests
docker-compose exec backend pytest
docker-compose exec frontend npm test

# Stop environment
docker-compose down

# Reset database
docker-compose down -v
docker-compose up -d
docker-compose exec backend alembic upgrade head
```

---

This gives you a solid foundation to start building immediately!
