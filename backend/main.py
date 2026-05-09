from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import io
import httpx
import uuid
import os
from typing import List, Optional
from datetime import datetime, timezone

import models
import schemas
import database
import auth
from database import get_db
from osprey_processor import process_tlm_file

app = FastAPI(title="Osprey Flight Analytics API")

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000", "http://localhost:4173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# WMO weather code to description mapping (subset)
WMO_CODES = {
    0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Foggy", 48: "Icy fog", 51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
    61: "Light rain", 63: "Rain", 65: "Heavy rain", 71: "Light snow", 73: "Snow", 75: "Heavy snow",
    80: "Rain showers", 81: "Rain showers", 82: "Heavy rain showers",
    95: "Thunderstorm", 96: "Thunderstorm w/ hail", 99: "Thunderstorm w/ heavy hail",
}

def degrees_to_cardinal(deg):
    if deg is None:
        return None
    dirs = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"]
    return dirs[round(deg / 22.5) % 16]

def fetch_weather_for_session(lat: float, lon: float, session_time: datetime) -> Optional[dict]:
    """Fetch historical weather from Open-Meteo for a given location and time."""
    try:
        if session_time.tzinfo is None:
            session_time = session_time.replace(tzinfo=timezone.utc)

        date_str = session_time.strftime('%Y-%m-%d')
        url = "https://archive-api.open-meteo.com/v1/archive"
        params = {
            "latitude": lat,
            "longitude": lon,
            "start_date": date_str,
            "end_date": date_str,
            "hourly": "temperature_2m,windspeed_10m,winddirection_10m,weathercode",
            "temperature_unit": "fahrenheit",
            "windspeed_unit": "mph",
            "timezone": "UTC",
        }
        response = httpx.get(url, params=params, timeout=8.0)
        if response.status_code != 200:
            return None

        hourly = response.json().get("hourly", {})
        times = hourly.get("time", [])
        if not times:
            return None

        session_hour = session_time.replace(minute=0, second=0, microsecond=0)
        target = session_hour.strftime('%Y-%m-%dT%H:00')
        idx = times.index(target) if target in times else 0

        temp = hourly.get("temperature_2m", [])[idx]
        wind_speed = hourly.get("windspeed_10m", [])[idx]
        wind_dir = hourly.get("winddirection_10m", [])[idx]
        wcode = hourly.get("weathercode", [])[idx]

        return {
            "temperature_f": round(temp, 1) if temp is not None else None,
            "wind_speed_mph": round(wind_speed, 1) if wind_speed is not None else None,
            "wind_direction": degrees_to_cardinal(wind_dir),
            "conditions": WMO_CODES.get(wcode, f"Code {wcode}") if wcode is not None else None,
        }
    except Exception as e:
        print(f"[WEATHER] Exception: {e}")
        return None

# Database tables are managed by Alembic migrations
# Run: alembic upgrade head

def store_weather_on_session(db_session):
    """Fetch weather and store it on the session if location is set."""
    if db_session.location and not db_session.weather_temperature_f:
        weather = fetch_weather_for_session(
            db_session.location.latitude,
            db_session.location.longitude,
            db_session.start_time
        )
        if weather:
            db_session.weather_temperature_f = weather.get("temperature_f")
            db_session.weather_wind_speed_mph = weather.get("wind_speed_mph")
            db_session.weather_wind_direction = weather.get("wind_direction")
            db_session.weather_conditions = weather.get("conditions")


# Auth Endpoints

@app.post("/api/auth/register", response_model=schemas.Token)
def register(user_data: schemas.UserRegister, db: Session = Depends(get_db)):
    """Register a new user account"""
    existing = db.query(models.User).filter(models.User.email == user_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_count = db.query(models.User).count()
    role = "admin" if user_count == 0 else "user"

    user = models.User(
        id=str(uuid.uuid4()),
        email=user_data.email,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        password_hash=auth.get_password_hash(user_data.password),
        email_verified=True,
        role=role,
        created_at=datetime.now(timezone.utc),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    access_token = auth.create_access_token(data={"sub": user.id})
    return {"access_token": access_token, "token_type": "bearer"}


@app.post("/api/auth/login", response_model=schemas.Token)
def login(credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    """Login with email and password"""
    user = db.query(models.User).filter(models.User.email == credentials.email).first()
    if not user or not user.password_hash or not auth.verify_password(credentials.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    access_token = auth.create_access_token(data={"sub": user.id})
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/api/auth/me", response_model=schemas.UserProfileResponse)
def get_me(current_user: models.User = Depends(auth.get_current_user)):
    """Get the currently authenticated user"""
    return current_user


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.post("/api/upload", response_model=schemas.UploadResponse)
async def upload_tlm_file(
    file: UploadFile = File(...),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Upload and process a TLM file"""
    if not file.filename.endswith('.TLM') and not file.filename.endswith('.tlm'):
        raise HTTPException(status_code=400, detail="Only TLM files are supported")

    contents = await file.read()
    file_obj = io.BytesIO(contents)

    result = process_tlm_file(file_obj, is_metric=False)

    session_ids = []
    for session_data in result['sessions']:
        db_session = models.FlightSession(
            user_id=current_user.id,
            start_time=session_data['start_time'],
            duration_seconds=session_data['duration_seconds'],
            launch_count=session_data['launch_count'],
            thermal_count=session_data['thermal_count'],
            total_thermal_gain=session_data['total_thermal_gain'],
            total_thermal_duration=session_data['total_thermal_duration'],
            thermal_launch_ratio=session_data['thermal_launch_ratio'],
            altitude_data=session_data['altitude_data'],
            aircraft_model=session_data.get('aircraft_model')
        )
        db.add(db_session)
        db.flush()
        session_ids.append(db_session.id)

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
    current_user: models.User = Depends(auth.get_current_user),
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Get all sessions for the authenticated user"""
    sessions = db.query(models.FlightSession)\
        .filter(models.FlightSession.user_id == current_user.id)\
        .order_by(models.FlightSession.start_time.asc())\
        .offset(skip)\
        .limit(limit)\
        .all()
    return sessions

@app.get("/api/sessions-with-thermals", response_model=List[schemas.SessionDetail])
def get_sessions_with_thermals(
    current_user: models.User = Depends(auth.get_current_user),
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Get all sessions for the authenticated user with thermal data included"""
    sessions = db.query(models.FlightSession)\
        .filter(models.FlightSession.user_id == current_user.id)\
        .order_by(models.FlightSession.start_time.asc())\
        .offset(skip)\
        .limit(limit)\
        .all()

    result = []
    for session in sessions:
        thermals = db.query(models.Thermal)\
            .filter(models.Thermal.session_id == session.id)\
            .all()

        session_dict = {
            **session.__dict__,
            "thermals": thermals
        }
        result.append(session_dict)

    return result

@app.get("/api/sessions/{session_id}", response_model=schemas.SessionDetail)
def get_session_detail(
    session_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed session data including altitude chart and thermals"""
    from sqlalchemy.orm import joinedload
    session = db.query(models.FlightSession)\
        .options(joinedload(models.FlightSession.location))\
        .filter(models.FlightSession.id == session_id)\
        .filter(models.FlightSession.user_id == current_user.id)\
        .first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    thermals = db.query(models.Thermal)\
        .filter(models.Thermal.session_id == session_id)\
        .all()

    return {
        **session.__dict__,
        "thermals": thermals,
        "location": session.location,
    }

@app.post("/api/backfill-weather")
def backfill_weather(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Fetch and store weather for all sessions that don't have it yet."""
    from sqlalchemy.orm import joinedload
    sessions = db.query(models.FlightSession)\
        .options(joinedload(models.FlightSession.location))\
        .filter(models.FlightSession.user_id == current_user.id)\
        .filter(models.FlightSession.weather_temperature_f == None)\
        .all()

    updated = 0
    for session in sessions:
        store_weather_on_session(session)
        if session.weather_temperature_f is not None:
            updated += 1
            db.commit()

    return {"message": f"Updated weather for {updated} of {len(sessions)} sessions"}

@app.get("/api/daily-summary", response_model=List[schemas.DailySummary])
def get_daily_summary(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Get daily aggregated statistics"""
    from sqlalchemy import func

    results = db.query(
        func.date(models.FlightSession.start_time).label('date'),
        func.count(models.FlightSession.id).label('session_count'),
        func.sum(models.FlightSession.launch_count).label('launches'),
        func.sum(models.FlightSession.thermal_count).label('thermals'),
        func.sum(models.FlightSession.total_thermal_gain).label('total_gain'),
        func.sum(models.FlightSession.total_thermal_duration).label('thermal_duration'),
        func.sum(models.FlightSession.duration_seconds).label('session_duration')
    ).filter(models.FlightSession.user_id == current_user.id)\
     .group_by(func.date(models.FlightSession.start_time))\
     .order_by(func.date(models.FlightSession.start_time).desc())\
     .all()

    daily_weather = {}
    for r in results:
        sessions_that_day = db.query(models.FlightSession)\
            .filter(models.FlightSession.user_id == current_user.id)\
            .filter(func.date(models.FlightSession.start_time) == r.date)\
            .order_by(models.FlightSession.start_time)\
            .all()
        mid = sessions_that_day[len(sessions_that_day) // 2] if sessions_that_day else None
        daily_weather[str(r.date)] = {
            "weather_temperature_f": mid.weather_temperature_f if mid else None,
            "weather_wind_speed_mph": mid.weather_wind_speed_mph if mid else None,
            "weather_wind_direction": mid.weather_wind_direction if mid else None,
            "weather_conditions": mid.weather_conditions if mid else None,
        }

    return [
        {
            "date": r.date,
            "session_count": r.session_count or 0,
            "launch_count": r.launches or 0,
            "thermal_count": r.thermals or 0,
            "total_thermal_gain": r.total_gain or 0,
            "total_thermal_duration": r.thermal_duration or 0,
            "session_duration": r.session_duration or 0,
            "thermal_launch_ratio": r.thermals / r.launches if r.launches else 0,
            **daily_weather.get(str(r.date), {})
        }
        for r in results
    ]

@app.delete("/api/sessions/bulk")
def delete_bulk_sessions(
    payload: schemas.BulkDeleteRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Delete multiple sessions by ID"""
    session_ids = payload.session_ids
    db.query(models.Thermal)\
        .filter(models.Thermal.session_id.in_(session_ids))\
        .delete(synchronize_session=False)
    deleted = db.query(models.FlightSession)\
        .filter(models.FlightSession.id.in_(session_ids))\
        .filter(models.FlightSession.user_id == current_user.id)\
        .delete(synchronize_session=False)
    db.commit()
    return {"message": f"Deleted {deleted} sessions"}

@app.delete("/api/sessions/{session_id}")
def delete_session(
    session_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a session and its associated thermals"""
    session = db.query(models.FlightSession)\
        .filter(models.FlightSession.id == session_id)\
        .filter(models.FlightSession.user_id == current_user.id)\
        .first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    db.query(models.Thermal)\
        .filter(models.Thermal.session_id == session_id)\
        .delete()

    db.delete(session)
    db.commit()

    return {"message": "Session deleted successfully"}

@app.delete("/api/sessions")
def delete_all_sessions(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Delete all sessions and their associated thermals for the authenticated user"""
    session_ids = db.query(models.FlightSession.id)\
        .filter(models.FlightSession.user_id == current_user.id)\
        .all()

    if not session_ids:
        return {"message": "No sessions found to delete"}

    session_ids = [sid[0] for sid in session_ids]

    thermal_count = db.query(models.Thermal)\
        .filter(models.Thermal.session_id.in_(session_ids))\
        .delete(synchronize_session=False)

    session_count = db.query(models.FlightSession)\
        .filter(models.FlightSession.user_id == current_user.id)\
        .delete(synchronize_session=False)

    db.commit()

    return {
        "message": f"Deleted {session_count} sessions and {thermal_count} thermals"
    }


# User Profile Endpoints

@app.get("/api/profile", response_model=schemas.UserProfileResponse)
def get_user_profile(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Get the authenticated user's profile"""
    return current_user

@app.put("/api/profile", response_model=schemas.UserProfileResponse)
def update_user_profile(
    profile: schemas.UserProfileUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Update the authenticated user's profile"""
    if profile.first_name is not None:
        current_user.first_name = profile.first_name
    if profile.last_name is not None:
        current_user.last_name = profile.last_name
    if profile.photo_url is not None:
        current_user.photo_url = profile.photo_url
    if profile.home_location_id is not None:
        current_user.home_location_id = profile.home_location_id

    db.commit()
    db.refresh(current_user)
    return current_user


# Flying Location Endpoints

@app.get("/api/locations", response_model=List[schemas.FlyingLocationResponse])
def get_flying_locations(
    approved_only: str = "true",
    db: Session = Depends(get_db)
):
    """Get list of flying locations"""
    query = db.query(models.FlyingLocation)
    if approved_only.lower() == "true":
        query = query.filter(models.FlyingLocation.approved == True)
    return query.all()

@app.post("/api/locations", response_model=schemas.FlyingLocationResponse)
def create_flying_location(
    location: schemas.FlyingLocationCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Submit a new flying location for approval"""
    db_location = models.FlyingLocation(
        name=location.name,
        country=location.country,
        latitude=location.latitude,
        longitude=location.longitude,
        submitted_by=current_user.id,
        approved=False,
        created_at=datetime.now(timezone.utc),
    )
    db.add(db_location)
    db.commit()
    db.refresh(db_location)
    return db_location

@app.put("/api/sessions/{session_id}/location")
def update_session_location(
    session_id: int,
    location_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Update session location"""
    session = db.query(models.FlightSession).filter(
        models.FlightSession.id == session_id,
        models.FlightSession.user_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    location = db.query(models.FlyingLocation).filter(
        models.FlyingLocation.id == location_id
    ).first()

    if not location:
        raise HTTPException(status_code=404, detail="Location not found")

    session.location_id = location_id
    db.commit()

    return {"message": "Location updated successfully"}

@app.put("/api/locations/{location_id}/approve")
def approve_flying_location(
    location_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Approve a flying location (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    location = db.query(models.FlyingLocation).filter(models.FlyingLocation.id == location_id).first()

    if not location:
        raise HTTPException(status_code=404, detail="Location not found")

    location.approved = True
    db.commit()
    return {"message": "Location approved"}
