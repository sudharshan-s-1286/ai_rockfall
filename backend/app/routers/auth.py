from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
from app.database import get_db
from app.models import Worker
import hashlib

router = APIRouter(prefix="/auth", tags=["Auth"])

class LoginRequest(BaseModel):
    user_id: str
    password: str

class LoginResponse(BaseModel):
    user_id: str
    name: str
    shift: str
    role: str # "ADMIN" or "WORKER" (derived from logic, simplistic for now)

def verify_password(plain_password, hashed_password):
    # Simple SHA256 for demo purposes
    return hashlib.sha256(plain_password.encode()).hexdigest() == hashed_password

@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    # Special Admin backdoor if needed, or just treat admin as a worker with specific ID?
    # Requirement: "new users can login with their userid and password"
    # We will check the Worker table.
    
    # Hardcoded fallback for initial admin if not in DB yet (optional, but good for safety)
    if payload.user_id == "admin" and payload.password == "admin123":
        return LoginResponse(user_id="admin", name="Administrator", shift="All", role="ADMIN")
    
    if payload.user_id == "operator" and payload.password == "op123":
         return LoginResponse(user_id="operator", name="Operator", shift="All", role="OPERATOR")

    result = await db.execute(select(Worker).where(Worker.user_id == payload.user_id))
    user = result.scalars().first()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid User ID")
    
    if not user.password:
        # If user exists but has no password (legacy?), fail or allow?
        # For now failing is safer.
        raise HTTPException(status_code=401, detail="Account setup incomplete")

    if not verify_password(payload.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid Password")

    # Determine role - for now assume created users are operators/viewers unless specific ID
    role = "OPERATOR" 
    
    return LoginResponse(
        user_id=user.user_id,
        name=user.name,
        shift=user.shift,
        role=role
    )
