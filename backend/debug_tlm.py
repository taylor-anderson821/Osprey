"""
Debug script for tracing TLM file processing.
Usage: place your TLM file in the backend/ directory, set TLM_FILE below, then run.
"""
import sys
from osprey_processor import process_tlm_file

TLM_FILE = "../sample data/Avanti Jul 3 2026.TLM"

with open(TLM_FILE, "rb") as f:
    result = process_tlm_file(f, is_metric=False)

sessions = result["sessions"]
print(f"\n=== RESULTS: {len(sessions)} sessions ===\n")
for s in sessions:
    alt_pts = len(s["altitude_data"])
    print(
        f"Session {s['session_number']:>2}  "
        f"start={s['start_time']}  "
        f"dur={s['duration_seconds']:.0f}s  "
        f"alt_pts={alt_pts}  "
        f"thermals={s['thermal_count']}  "
        f"model={s.get('aircraft_model')}"
    )
    if alt_pts > 0:
        first = s["altitude_data"][0]
        last = s["altitude_data"][-1]
        altitudes = [p["altitude"] for p in s["altitude_data"]]
        print(f"         alt range: {min(altitudes):.0f}–{max(altitudes):.0f} ft  "
              f"first_ts={first['timestamp']:.1f}s  last_ts={last['timestamp']:.1f}s")
    else:
        print(f"         *** NO ALTITUDE DATA ***")
