"""
Osprey Flight Analytics MCP Server

Exposes flight session data as tools that Claude can use to answer
natural language questions about flight performance.

Required environment variables:
  DATABASE_URL       - PostgreSQL connection string (same as backend)
  OSPREY_USER_EMAIL  - Email of the user whose data to expose
"""

import os
from datetime import datetime
from typing import Optional

from dotenv import load_dotenv
from mcp.server.fastmcp import FastMCP
from sqlalchemy import create_engine, func, text
from sqlalchemy.orm import sessionmaker, Session

load_dotenv()

DATABASE_URL = os.environ["DATABASE_URL"]
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

USER_EMAIL = os.environ["OSPREY_USER_EMAIL"]

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

mcp = FastMCP("Osprey Flight Analytics")


def get_user_id(db: Session) -> str:
    row = db.execute(
        text("SELECT id FROM users WHERE email = :email"), {"email": USER_EMAIL}
    ).fetchone()
    if not row:
        raise ValueError(f"No user found with email {USER_EMAIL}")
    return row[0]


def fmt_duration(seconds: float) -> str:
    if seconds is None:
        return "unknown"
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    if h > 0:
        return f"{h}h {m}m {s}s"
    return f"{m}m {s}s"


def fmt_session_row(s) -> str:
    parts = [
        f"  ID: {s.id}",
        f"  Date: {s.start_time.strftime('%Y-%m-%d %H:%M') if s.start_time else 'unknown'}",
        f"  Duration: {fmt_duration(s.duration_seconds)}",
        f"  Launches: {s.launch_count}",
        f"  Thermals: {s.thermal_count}",
        f"  Total thermal gain: {s.total_thermal_gain:.0f} ft" if s.total_thermal_gain else "  Total thermal gain: 0 ft",
        f"  Thermal duration: {fmt_duration(s.total_thermal_duration)}",
    ]
    if s.aircraft_model:
        parts.append(f"  Aircraft: {s.aircraft_model}")
    if s.location_name:
        parts.append(f"  Location: {s.location_name}")
    if s.weather_temperature_f is not None:
        parts.append(f"  Weather: {s.weather_temperature_f:.0f}°F, {s.weather_conditions or ''}, wind {s.weather_wind_speed_mph:.0f} mph {s.weather_wind_direction or ''}")
    return "\n".join(parts)


SESSION_QUERY = """
    SELECT
        fs.id,
        fs.start_time,
        fs.duration_seconds,
        fs.launch_count,
        fs.thermal_count,
        fs.total_thermal_gain,
        fs.total_thermal_duration,
        fs.thermal_launch_ratio,
        fs.aircraft_model,
        fs.weather_temperature_f,
        fs.weather_wind_speed_mph,
        fs.weather_wind_direction,
        fs.weather_conditions,
        fl.name AS location_name
    FROM flight_sessions fs
    LEFT JOIN flying_locations fl ON fl.id = fs.location_id
    WHERE fs.user_id = :user_id
"""


@mcp.tool()
def list_sessions(limit: int = 20, offset: int = 0) -> str:
    """List flight sessions with key stats. Returns the most recent sessions first."""
    with SessionLocal() as db:
        user_id = get_user_id(db)
        rows = db.execute(
            text(SESSION_QUERY + " ORDER BY fs.start_time DESC LIMIT :limit OFFSET :offset"),
            {"user_id": user_id, "limit": limit, "offset": offset},
        ).fetchall()

    if not rows:
        return "No sessions found."

    lines = [f"Found {len(rows)} sessions (showing {offset+1}-{offset+len(rows)}):\n"]
    for r in rows:
        lines.append(fmt_session_row(r))
        lines.append("")
    return "\n".join(lines)


@mcp.tool()
def get_session_detail(session_id: int) -> str:
    """Get full detail for a specific session including every thermal."""
    with SessionLocal() as db:
        user_id = get_user_id(db)
        row = db.execute(
            text(SESSION_QUERY + " AND fs.id = :session_id"),
            {"user_id": user_id, "session_id": session_id},
        ).fetchone()

        if not row:
            return f"Session {session_id} not found."

        thermals = db.execute(
            text("""
                SELECT thermal_number, start_time, end_time, start_altitude, end_altitude,
                       duration, altitude_gain, avg_climb_rate
                FROM thermals
                WHERE session_id = :session_id
                ORDER BY thermal_number
            """),
            {"session_id": session_id},
        ).fetchall()

    lines = ["Session Detail:", fmt_session_row(row), ""]

    if thermals:
        lines.append(f"Thermals ({len(thermals)} total):")
        for t in thermals:
            lines.append(
                f"  #{t.thermal_number}: {t.altitude_gain:.0f} ft gain in {fmt_duration(t.duration)}"
                f" @ {t.avg_climb_rate:.1f} ft/s avg climb"
                f" ({t.start_altitude:.0f}→{t.end_altitude:.0f} ft)"
            )
    else:
        lines.append("No thermals recorded for this session.")

    return "\n".join(lines)


@mcp.tool()
def get_profile_stats() -> str:
    """Get lifetime aggregate statistics: total flight time, best sessions, best thermals, etc."""
    with SessionLocal() as db:
        user_id = get_user_id(db)

        agg = db.execute(
            text("""
                SELECT
                    COUNT(DISTINCT DATE(start_time)) AS flying_days,
                    COUNT(*) AS total_sessions,
                    SUM(duration_seconds) AS total_flight_time,
                    SUM(total_thermal_gain) AS total_thermal_gain,
                    SUM(total_thermal_duration) AS total_thermal_duration,
                    SUM(launch_count) AS total_launches,
                    SUM(thermal_count) AS total_thermals
                FROM flight_sessions
                WHERE user_id = :user_id
            """),
            {"user_id": user_id},
        ).fetchone()

        best_flight = db.execute(
            text("""
                SELECT id, start_time, duration_seconds FROM flight_sessions
                WHERE user_id = :user_id ORDER BY duration_seconds DESC LIMIT 1
            """),
            {"user_id": user_id},
        ).fetchone()

        best_gain_session = db.execute(
            text("""
                SELECT id, start_time, total_thermal_gain FROM flight_sessions
                WHERE user_id = :user_id ORDER BY total_thermal_gain DESC LIMIT 1
            """),
            {"user_id": user_id},
        ).fetchone()

        best_thermal = db.execute(
            text("""
                SELECT t.session_id, t.thermal_number, t.altitude_gain, t.avg_climb_rate, t.duration
                FROM thermals t
                JOIN flight_sessions fs ON fs.id = t.session_id
                WHERE fs.user_id = :user_id
                ORDER BY t.altitude_gain DESC LIMIT 1
            """),
            {"user_id": user_id},
        ).fetchone()

        best_climb = db.execute(
            text("""
                SELECT t.session_id, t.thermal_number, t.altitude_gain, t.avg_climb_rate, t.duration
                FROM thermals t
                JOIN flight_sessions fs ON fs.id = t.session_id
                WHERE fs.user_id = :user_id
                ORDER BY t.avg_climb_rate DESC LIMIT 1
            """),
            {"user_id": user_id},
        ).fetchone()

        aircraft = db.execute(
            text("""
                SELECT DISTINCT aircraft_model FROM flight_sessions
                WHERE user_id = :user_id AND aircraft_model IS NOT NULL
                ORDER BY aircraft_model
            """),
            {"user_id": user_id},
        ).fetchall()

    lines = ["Lifetime Stats:"]
    lines.append(f"  Flying days: {agg.flying_days or 0}")
    lines.append(f"  Total sessions: {agg.total_sessions or 0}")
    lines.append(f"  Total flight time: {fmt_duration(agg.total_flight_time or 0)}")
    lines.append(f"  Total launches: {agg.total_launches or 0}")
    lines.append(f"  Total thermals caught: {agg.total_thermals or 0}")
    lines.append(f"  Total altitude gained in thermals: {(agg.total_thermal_gain or 0):.0f} ft")
    lines.append(f"  Total time in thermals: {fmt_duration(agg.total_thermal_duration or 0)}")

    if aircraft:
        lines.append(f"  Aircraft flown: {', '.join(r[0] for r in aircraft)}")

    if best_flight:
        lines.append(f"\nLongest session:")
        lines.append(f"  Session #{best_flight.id} on {best_flight.start_time.strftime('%Y-%m-%d')}: {fmt_duration(best_flight.duration_seconds)}")

    if best_gain_session:
        lines.append(f"\nMost altitude gained in thermals (single session):")
        lines.append(f"  Session #{best_gain_session.id} on {best_gain_session.start_time.strftime('%Y-%m-%d')}: {best_gain_session.total_thermal_gain:.0f} ft")

    if best_thermal:
        lines.append(f"\nBest single thermal (altitude gain):")
        lines.append(f"  Session #{best_thermal.session_id}, thermal #{best_thermal.thermal_number}: {best_thermal.altitude_gain:.0f} ft gain in {fmt_duration(best_thermal.duration)}")

    if best_climb:
        lines.append(f"\nBest single thermal (climb rate):")
        lines.append(f"  Session #{best_climb.session_id}, thermal #{best_climb.thermal_number}: {best_climb.avg_climb_rate:.1f} ft/s avg over {fmt_duration(best_climb.duration)}")

    return "\n".join(lines)


@mcp.tool()
def get_daily_summary() -> str:
    """Get a day-by-day breakdown of flying activity."""
    with SessionLocal() as db:
        user_id = get_user_id(db)
        rows = db.execute(
            text("""
                SELECT
                    DATE(start_time) AS date,
                    COUNT(*) AS session_count,
                    SUM(launch_count) AS launches,
                    SUM(thermal_count) AS thermals,
                    SUM(total_thermal_gain) AS total_gain,
                    SUM(total_thermal_duration) AS thermal_duration,
                    SUM(duration_seconds) AS flight_time,
                    MIN(weather_temperature_f) AS temp_f,
                    MIN(weather_wind_speed_mph) AS wind_mph,
                    MIN(weather_wind_direction) AS wind_dir,
                    MIN(weather_conditions) AS conditions
                FROM flight_sessions
                WHERE user_id = :user_id
                GROUP BY DATE(start_time)
                ORDER BY date DESC
            """),
            {"user_id": user_id},
        ).fetchall()

    if not rows:
        return "No flying days found."

    lines = [f"Daily Summary ({len(rows)} flying days):\n"]
    for r in rows:
        line = (
            f"  {r.date}  {fmt_duration(r.flight_time)}  "
            f"{r.launches} launches  {r.thermals} thermals  {(r.total_gain or 0):.0f} ft gained"
        )
        if r.temp_f is not None:
            line += f"  {r.temp_f:.0f}°F {r.conditions or ''} {r.wind_mph:.0f}mph {r.wind_dir or ''}"
        lines.append(line)

    return "\n".join(lines)


@mcp.tool()
def search_sessions(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    aircraft_model: Optional[str] = None,
    min_thermals: Optional[int] = None,
    min_duration_minutes: Optional[float] = None,
    weather_condition: Optional[str] = None,
    limit: int = 20,
) -> str:
    """
    Search and filter sessions.

    Args:
        start_date: Filter sessions on or after this date (YYYY-MM-DD)
        end_date: Filter sessions on or before this date (YYYY-MM-DD)
        aircraft_model: Filter by aircraft model name (partial match)
        min_thermals: Only sessions with at least this many thermals
        min_duration_minutes: Only sessions at least this long
        weather_condition: Filter by weather description (partial match, e.g. 'Clear', 'Rain')
        limit: Max results to return
    """
    with SessionLocal() as db:
        user_id = get_user_id(db)

        conditions = ["fs.user_id = :user_id"]
        params: dict = {"user_id": user_id, "limit": limit}

        if start_date:
            conditions.append("fs.start_time >= :start_date")
            params["start_date"] = start_date
        if end_date:
            conditions.append("fs.start_time <= :end_date")
            params["end_date"] = end_date + " 23:59:59"
        if aircraft_model:
            conditions.append("LOWER(fs.aircraft_model) LIKE :aircraft")
            params["aircraft"] = f"%{aircraft_model.lower()}%"
        if min_thermals is not None:
            conditions.append("fs.thermal_count >= :min_thermals")
            params["min_thermals"] = min_thermals
        if min_duration_minutes is not None:
            conditions.append("fs.duration_seconds >= :min_duration")
            params["min_duration"] = min_duration_minutes * 60
        if weather_condition:
            conditions.append("LOWER(fs.weather_conditions) LIKE :weather")
            params["weather"] = f"%{weather_condition.lower()}%"

        where = " AND ".join(conditions)
        rows = db.execute(
            text(f"""
                SELECT
                    fs.id, fs.start_time, fs.duration_seconds, fs.launch_count,
                    fs.thermal_count, fs.total_thermal_gain, fs.total_thermal_duration,
                    fs.thermal_launch_ratio, fs.aircraft_model,
                    fs.weather_temperature_f, fs.weather_wind_speed_mph,
                    fs.weather_wind_direction, fs.weather_conditions,
                    fl.name AS location_name
                FROM flight_sessions fs
                LEFT JOIN flying_locations fl ON fl.id = fs.location_id
                WHERE {where}
                ORDER BY fs.start_time DESC
                LIMIT :limit
            """),
            params,
        ).fetchall()

    if not rows:
        return "No sessions match the given filters."

    lines = [f"Found {len(rows)} matching sessions:\n"]
    for r in rows:
        lines.append(fmt_session_row(r))
        lines.append("")
    return "\n".join(lines)


@mcp.tool()
def get_best_thermals(
    rank_by: str = "altitude_gain",
    limit: int = 10,
) -> str:
    """
    Get the top thermals across all sessions.

    Args:
        rank_by: One of 'altitude_gain', 'avg_climb_rate', or 'duration'
        limit: Number of thermals to return
    """
    valid = {"altitude_gain", "avg_climb_rate", "duration"}
    if rank_by not in valid:
        return f"rank_by must be one of: {', '.join(sorted(valid))}"

    with SessionLocal() as db:
        user_id = get_user_id(db)
        rows = db.execute(
            text(f"""
                SELECT
                    t.id, t.session_id, t.thermal_number,
                    t.altitude_gain, t.avg_climb_rate, t.duration,
                    t.start_altitude, t.end_altitude,
                    fs.start_time
                FROM thermals t
                JOIN flight_sessions fs ON fs.id = t.session_id
                WHERE fs.user_id = :user_id
                ORDER BY t.{rank_by} DESC
                LIMIT :limit
            """),
            {"user_id": user_id, "limit": limit},
        ).fetchall()

    if not rows:
        return "No thermals found."

    label = {"altitude_gain": "Altitude Gain", "avg_climb_rate": "Avg Climb Rate", "duration": "Duration"}[rank_by]
    lines = [f"Top {len(rows)} thermals by {label}:\n"]
    for i, t in enumerate(rows, 1):
        lines.append(
            f"  #{i}  Session {t.session_id} ({t.start_time.strftime('%Y-%m-%d')})  "
            f"Thermal #{t.thermal_number}  "
            f"{t.altitude_gain:.0f} ft gain  "
            f"{t.avg_climb_rate:.1f} ft/s  "
            f"{fmt_duration(t.duration)}  "
            f"({t.start_altitude:.0f}→{t.end_altitude:.0f} ft)"
        )
    return "\n".join(lines)


if __name__ == "__main__":
    mcp.run()
