#!/usr/bin/env python3
"""
Script to delete all session records from the database
"""
import sys
import os
sys.path.append('backend')

from backend.database import SessionLocal
from backend.models import FlightSession, Thermal

def delete_all_sessions(user_id="demo_user"):
    db = SessionLocal()
    try:
        # Get all session IDs for this user
        session_ids = db.query(FlightSession.id)\
            .filter(FlightSession.user_id == user_id)\
            .all()
        
        if not session_ids:
            print("No sessions found to delete")
            return
        
        session_ids = [sid[0] for sid in session_ids]
        
        # Delete all thermals for these sessions
        thermal_count = db.query(Thermal)\
            .filter(Thermal.session_id.in_(session_ids))\
            .delete(synchronize_session=False)
        
        # Delete all sessions for this user
        session_count = db.query(FlightSession)\
            .filter(FlightSession.user_id == user_id)\
            .delete(synchronize_session=False)
        
        db.commit()
        
        print(f"Deleted {session_count} sessions and {thermal_count} thermals")
        
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    user_id = sys.argv[1] if len(sys.argv) > 1 else "demo_user"
    delete_all_sessions(user_id)