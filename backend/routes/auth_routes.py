from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
import sqlite3
import json
from utils.auth import (
    verify_password, get_password_hash, create_access_token, 
    ACCESS_TOKEN_EXPIRE_MINUTES, get_db, get_current_active_user
)
from datetime import timedelta

router = APIRouter(prefix="/auth", tags=["Authentication"])

class UserCreate(BaseModel):
    email: str
    password: str
    name: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    role: str
    feature_flags: dict

@router.post("/register", response_model=UserResponse)
def register_user(user: UserCreate, db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    # Check if email exists
    cursor.execute("SELECT id FROM users WHERE email = ?", (user.email,))
    if cursor.fetchone():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user.password)
    default_flags = json.dumps({})
    
    cursor.execute(
        "INSERT INTO users (email, password_hash, name, role, feature_flags) VALUES (?, ?, ?, 'user', ?)",
        (user.email, hashed_password, user.name, default_flags)
    )
    db.commit()
    user_id = cursor.lastrowid
    
    return {
        "id": user_id,
        "email": user.email,
        "name": user.name,
        "role": "user",
        "feature_flags": {}
    }

@router.post("/login", response_model=Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT * FROM users WHERE email = ?", (form_data.username,))
    user = cursor.fetchone()
    
    if not user or not verify_password(form_data.password, user['password_hash']):
        # Special fallback for our admin user since we seeded it with 'to_be_hashed'
        if user and user['id'] == 1 and user['password_hash'] == 'to_be_hashed':
            # Allow login, but immediately hash the provided password so it's secure next time
            hashed_password = get_password_hash(form_data.password)
            cursor.execute("UPDATE users SET password_hash = ? WHERE id = 1", (hashed_password,))
            db.commit()
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user['id'])}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
def read_users_me(current_user: dict = Depends(get_current_active_user)):
    return {
        "id": current_user['id'],
        "email": current_user['email'],
        "name": current_user['name'],
        "role": current_user['role'],
        "feature_flags": json.loads(current_user['feature_flags'])
    }
