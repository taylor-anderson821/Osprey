from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

class ThermalBase(BaseModel):
    thermal_number: int
    start_time: float
    end_time: float
    start_altitude: float
    end_altitude: float
    duration: float
    altitude_gain: float
    avg_climb_rate: float

class ThermalResponse(ThermalBase):
    id: int
    session_id: int
    
    class Config:
        from_attributes = True

class FlyingLocationBase(BaseModel):
    name: str
    country: Optional[str] = None
    latitude: float
    longitude: float

class FlyingLocationCreate(FlyingLocationBase):
    pass

class FlyingLocationResponse(FlyingLocationBase):
    id: int
    approved: bool
    created_at: datetime
    submitted_by: Optional[str] = None
    
    class Config:
        from_attributes = True

class SessionSummary(BaseModel):
    id: int
    start_time: datetime
    duration_seconds: float
    launch_count: int
    thermal_count: int
    total_thermal_gain: float
    total_thermal_duration: float
    thermal_launch_ratio: float
    aircraft_model: Optional[str] = None
    location: Optional[FlyingLocationResponse] = None
    weather_temperature_f: Optional[float] = None
    weather_wind_speed_mph: Optional[float] = None
    weather_wind_direction: Optional[str] = None
    weather_conditions: Optional[str] = None
    
    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat() if v.tzinfo else v.replace(tzinfo=None).isoformat() + 'Z'
        }

class SessionDetail(SessionSummary):
    altitude_data: List[dict]
    thermals: List[ThermalResponse]

class UploadResponse(BaseModel):
    message: str
    session_ids: List[int]

class DailySummary(BaseModel):
    date: datetime
    session_count: int
    launch_count: int
    thermal_count: int
    total_thermal_gain: float
    total_thermal_duration: float
    session_duration: float
    thermal_launch_ratio: float
    weather_temperature_f: Optional[float] = None
    weather_wind_speed_mph: Optional[float] = None
    weather_wind_direction: Optional[str] = None
    weather_conditions: Optional[str] = None

class UserProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    photo_url: Optional[str] = None
    home_location_id: Optional[int] = None

class UserProfileResponse(BaseModel):
    id: str
    email: str
    first_name: Optional[str]
    last_name: Optional[str]
    photo_url: Optional[str]
    home_location_id: Optional[int]
    home_location: Optional[FlyingLocationResponse]
    role: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class UserRegister(BaseModel):
    username: str
    email: str
    password: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str

class PasswordReset(BaseModel):
    email: str

class BulkDeleteRequest(BaseModel):
    session_ids: List[int]
