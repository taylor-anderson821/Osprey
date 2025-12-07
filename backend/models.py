from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON, Boolean
from sqlalchemy.orm import relationship
from database import Base

class FlightSession(Base):
    __tablename__ = "flight_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True)
    start_time = Column(DateTime(timezone=True))
    duration_seconds = Column(Float)
    launch_count = Column(Integer)
    thermal_count = Column(Integer)
    total_thermal_gain = Column(Float)
    total_thermal_duration = Column(Float)
    thermal_launch_ratio = Column(Float)
    altitude_data = Column(JSON)  # Stores time-series altitude data for charts
    
    thermals = relationship("Thermal", back_populates="session")

class Thermal(Base):
    __tablename__ = "thermals"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("flight_sessions.id"))
    thermal_number = Column(Integer)
    start_time = Column(Float)
    end_time = Column(Float)
    start_altitude = Column(Float)
    end_altitude = Column(Float)
    duration = Column(Float)
    altitude_gain = Column(Float)
    avg_climb_rate = Column(Float)
    
    session = relationship("FlightSession", back_populates="thermals")

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, index=True)  # user_id
    email = Column(String, unique=True, index=True)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    photo_url = Column(String, nullable=True)
    home_location_id = Column(Integer, ForeignKey("flying_locations.id"), nullable=True)
    role = Column(String, default="user")  # "user" or "admin"
    created_at = Column(DateTime(timezone=True))
    
    home_location = relationship("FlyingLocation", foreign_keys=[home_location_id], back_populates="users")

class FlyingLocation(Base):
    __tablename__ = "flying_locations"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    latitude = Column(Float)
    longitude = Column(Float)
    submitted_by = Column(String, ForeignKey("users.id"))
    approved = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True))
    
    users = relationship("User", foreign_keys=[User.home_location_id], back_populates="home_location")
