from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import io
from typing import List
from datetime import datetime

import models
import schemas
import database
from osprey_processor import process_tlm_file

app = FastAPI(title="Osprey Flight Analytics API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database tables are managed by Alembic migrations
# Run: alembic upgrade head
# models.Base.metadata.create_all(bind=database.engine)

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.post("/api/upload", response_model=schemas.UploadResponse)
async def upload_tlm_file(
    file: UploadFile = File(...),
    user_id: str = "demo_user",  # TODO: Replace with actual auth
    db: Session = Depends(get_db)
):
    """Upload and process a TLM file"""
    if not file.filename.endswith('.TLM') and not file.filename.endswith('.tlm'):
        raise HTTPException(status_code=400, detail="Only TLM files are supported")
    
    contents = await file.read()
    file_obj = io.BytesIO(contents)
    
    # Process the TLM file
    result = process_tlm_file(file_obj, is_metric=False)
    
    # Store sessions in database
    session_ids = []
    for session_data in result['sessions']:
        db_session = models.FlightSession(
            user_id=user_id,
            start_time=session_data['start_time'],
            duration_seconds=session_data['duration_seconds'],
            launch_count=session_data['launch_count'],
            thermal_count=session_data['thermal_count'],
            total_thermal_gain=session_data['total_thermal_gain'],
            total_thermal_duration=session_data['total_thermal_duration'],
            thermal_launch_ratio=session_data['thermal_launch_ratio'],
            altitude_data=session_data['altitude_data']
        )
        db.add(db_session)
        db.flush()
        session_ids.append(db_session.id)
        
        # Store thermals for this session
        for thermal_data in session_data['thermals']:
            db_thermal = models.Thermal(
                session_id=db_session.id,
                thermal_number=thermal_data['thermal_number'],
                start_time=thermal_data['start_time'],
                end_time=thermal_data['end_time'],
                start_altitude=thermal_data['start_altitude'],
                end_altitude=thermal_data['end_altitude'],
                duration=thermal_data['duration'],
                altitude_gain=thermal_data['altitude_gain'],
                avg_climb_rate=thermal_data['avg_climb_rate']
            )
            db.add(db_thermal)
    
    db.commit()
    
    return {
        "message": f"Processed {len(result['sessions'])} sessions with {result['total_thermals']} thermals",
        "session_ids": session_ids
    }

@app.get("/api/sessions", response_model=List[schemas.SessionSummary])
def get_sessions(
    user_id: str = "demo_user",
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Get all sessions for a user"""
    sessions = db.query(models.FlightSession)\
        .filter(models.FlightSession.user_id == user_id)\
        .order_by(models.FlightSession.start_time.asc())\
        .offset(skip)\
        .limit(limit)\
        .all()
    return sessions

@app.get("/api/sessions/{session_id}", response_model=schemas.SessionDetail)
def get_session_detail(
    session_id: int,
    user_id: str = "demo_user",
    db: Session = Depends(get_db)
):
    """Get detailed session data including altitude chart and thermals"""
    session = db.query(models.FlightSession)\
        .filter(models.FlightSession.id == session_id)\
        .filter(models.FlightSession.user_id == user_id)\
        .first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    thermals = db.query(models.Thermal)\
        .filter(models.Thermal.session_id == session_id)\
        .all()
    
    return {
        **session.__dict__,
        "thermals": thermals
    }

@app.get("/api/daily-summary", response_model=List[schemas.DailySummary])
def get_daily_summary(
    user_id: str = "demo_user",
    db: Session = Depends(get_db)
):
    """Get daily aggregated statistics"""
    # Aggregate sessions by date
    from sqlalchemy import func
    from datetime import date
    
    results = db.query(
        func.date(models.FlightSession.start_time).label('date'),
        func.count(models.FlightSession.id).label('session_count'),
        func.sum(models.FlightSession.launch_count).label('launches'),
        func.sum(models.FlightSession.thermal_count).label('thermals'),
        func.sum(models.FlightSession.total_thermal_gain).label('total_gain'),
        func.sum(models.FlightSession.total_thermal_duration).label('thermal_duration'),
        func.sum(models.FlightSession.duration_seconds).label('session_duration')
    ).filter(models.FlightSession.user_id == user_id)\
     .group_by(func.date(models.FlightSession.start_time))\
     .order_by(func.date(models.FlightSession.start_time).desc())\
     .all()
    
    return [
        {
            "date": r.date,
            "session_count": r.session_count or 0,
            "launch_count": r.launches or 0,
            "thermal_count": r.thermals or 0,
            "total_thermal_gain": r.total_gain or 0,
            "total_thermal_duration": r.thermal_duration or 0,
            "session_duration": r.session_duration or 0,
            "thermal_launch_ratio": r.thermals / r.launches if r.launches else 0
        }
        for r in results
    ]

@app.delete("/api/sessions/{session_id}")
def delete_session(
    session_id: int,
    user_id: str = "demo_user",
    db: Session = Depends(get_db)
):
    """Delete a session and its associated thermals"""
    session = db.query(models.FlightSession)\
        .filter(models.FlightSession.id == session_id)\
        .filter(models.FlightSession.user_id == user_id)\
        .first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Delete associated thermals first (due to foreign key constraint)
    db.query(models.Thermal)\
        .filter(models.Thermal.session_id == session_id)\
        .delete()
    
    # Delete the session
    db.delete(session)
    db.commit()
    
    return {"message": "Session deleted successfully"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}


# User Profile Endpoints
@app.get("/api/profile", response_model=schemas.UserProfileResponse)
def get_user_profile(
    user_id: str = "demo_user",
    db: Session = Depends(get_db)
):
    """Get user profile"""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    
    if not user:
        # Create default user if doesn't exist
        from datetime import datetime as dt
        # First user becomes admin, others are regular users
        user_count = db.query(models.User).count()
        role = "admin" if user_count == 0 else "user"
        
        user = models.User(
            id=user_id,
            email=f"{user_id}@example.com",
            role=role,
            created_at=dt.now()
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    
    return user

@app.put("/api/profile", response_model=schemas.UserProfileResponse)
def update_user_profile(
    profile: schemas.UserProfileUpdate,
    user_id: str = "demo_user",
    db: Session = Depends(get_db)
):
    """Update user profile"""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if profile.first_name is not None:
        user.first_name = profile.first_name
    if profile.last_name is not None:
        user.last_name = profile.last_name
    if profile.photo_url is not None:
        user.photo_url = profile.photo_url
    if profile.home_location_id is not None:
        user.home_location_id = profile.home_location_id
    
    db.commit()
    db.refresh(user)
    return user

# Flying Location Endpoints
@app.get("/api/locations", response_model=List[schemas.FlyingLocationResponse])
def get_flying_locations(
    approved_only: str = "true",
    db: Session = Depends(get_db)
):
    """Get list of flying locations"""
    query = db.query(models.FlyingLocation)
    # Convert string to boolean
    if approved_only.lower() == "true":
        query = query.filter(models.FlyingLocation.approved == True)
    return query.all()

@app.post("/api/locations", response_model=schemas.FlyingLocationResponse)
def create_flying_location(
    location: schemas.FlyingLocationCreate,
    user_id: str = "demo_user",
    db: Session = Depends(get_db)
):
    """Submit a new flying location for approval"""
    from datetime import datetime as dt
    
    db_location = models.FlyingLocation(
        name=location.name,
        latitude=location.latitude,
        longitude=location.longitude,
        submitted_by=user_id,
        approved=False,
        created_at=dt.now()
    )
    db.add(db_location)
    db.commit()
    db.refresh(db_location)
    return db_location

@app.put("/api/locations/{location_id}/approve")
def approve_flying_location(
    location_id: int,
    user_id: str = "demo_user",
    db: Session = Depends(get_db)
):
    """Approve a flying location (admin only)"""
    # Check if user is admin
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user or user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    location = db.query(models.FlyingLocation).filter(models.FlyingLocation.id == location_id).first()
    
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    
    location.approved = True
    db.commit()
    return {"message": "Location approved"}
