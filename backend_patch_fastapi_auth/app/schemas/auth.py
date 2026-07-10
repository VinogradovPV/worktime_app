from pydantic import BaseModel, Field
from typing import Optional

class UserResponse(BaseModel):
    id: int
    login: str
    displayName: str
    role: str
    status: str
    orgUnitId: Optional[int] = None
    positionId: Optional[int] = None
    lastLoginAt: Optional[str] = None

    class Config:
        orm_mode = True
        allow_population_by_field_name = True
        fields = {
            "display_name": "displayName",
            "org_unit_id": "orgUnitId",
            "position_id": "positionId",
            "last_login_at": "lastLoginAt"
        }

class MessageResponse(BaseModel):
    ok: bool = True
    message: str = "Success"

class RegisterRequest(BaseModel):
    login: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8)
    passwordConfirm: str = Field(..., min_length=8)
    displayName: str = Field(..., min_length=1, max_length=100)
    orgUnitId: int
    positionId: int
    comment: Optional[str] = None

class AuthResponse(MessageResponse):
    status: str

class LoginRequest(BaseModel):
    login: str
    password: str

class LoginResponse(AuthResponse):
    access_token: str
    refresh_token: Optional[str] = None
    user: UserResponse

class PasswordResetRequiredResponse(AuthResponse):
    requiresPasswordChange: bool = True
    access_token: str
    user: UserResponse

class RefreshRequest(BaseModel):
    refresh_token: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)
