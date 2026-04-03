"""
Adapted from osprey.py to process TLM files and return JSON instead of XLSX
Preserves original logic as closely as possible
"""
import struct
import numpy
from datetime import datetime, timedelta

# Constants from original osprey.py
ALTITUDE_MOVING_AVG_WINDOW = 5
THERMAL_CANDIDATE_WINDOW = 30
THERMAL_MIN_PEAK_ALTITUDE_FT = 100
THERMAL_MINIMUM_GAIN_FT = 25
THERMAL_MAX_CLIMB_RATE_FPS = 7.5
THERMAL_MAX_CLIMB_RATE_LOOKBACK = 5
LAUNCH_MIN_CLIMB_RATE_FPS = 21
LAUNCH_MIN_CLIMB_RATE_LOOKBACK = 5
TROUGH_CANDIDATE_WINDOW = 10
SESSION_MINIMUM_DURATION = 30
M_TO_FT = 3.28084

class VarioRecord:
    def __init__(self, timestamp, altitude, climb_rate):
        self.timestamp = timestamp
        self.altitude = altitude
        self.climb_rate = climb_rate
        self.altitude_smoothed = 0.0
        self.thermal_peak_candidate = False
        self.thermal_peak = False
        self.launch_peak_candidate = False
        self.launch_peak = False
        self.trough_bottom_candidate = False
        self.trough_bottom = False

class SessionRecord:
    def __init__(self, start_datetime, start_date):
        self.start_time = start_datetime
        self.start_date = start_date
        self.launch_count = 0
        self.thermal_count = 0
        self.total_thermal_altitude_gain = 0
        self.total_thermal_duration = 0
        self.total_thermal_duration_hms = 0
        self.session_duration = 0
        self.session_duration_hms = ''
        self.thermal_launch_ratio = 0.0

def smooth_altitude_readings(vario_records):
    """Apply simple moving average to altitude data"""
    for i in range(len(vario_records)):
        if i < ALTITUDE_MOVING_AVG_WINDOW:
            vario_records[i].altitude_smoothed = vario_records[i].altitude
        else:
            average = numpy.sum([vario_records[j].altitude for j in range(i - ALTITUDE_MOVING_AVG_WINDOW + 1, i + 1)]) / ALTITUDE_MOVING_AVG_WINDOW
            vario_records[i].altitude_smoothed = float(average)

def identify_thermal_peaks(vario_records, session_records, session_number):
    """Identifies thermal peaks using original logic"""
    # Identify thermal peak candidates
    for i in range(THERMAL_CANDIDATE_WINDOW, len(vario_records) - THERMAL_CANDIDATE_WINDOW):
        if (vario_records[i].altitude_smoothed > vario_records[i - THERMAL_CANDIDATE_WINDOW].altitude_smoothed and
            vario_records[i].altitude_smoothed > vario_records[i + THERMAL_CANDIDATE_WINDOW].altitude_smoothed and
            vario_records[i].altitude_smoothed > THERMAL_MIN_PEAK_ALTITUDE_FT):
            vario_records[i].thermal_peak_candidate = True
    
    # Keep only the highest point in each cluster
    for i in range(THERMAL_CANDIDATE_WINDOW, len(vario_records) - THERMAL_CANDIDATE_WINDOW):
        if vario_records[i].thermal_peak_candidate:
            maximum_thermal_peak = 0.0
            for j in range(i - THERMAL_CANDIDATE_WINDOW, i + THERMAL_CANDIDATE_WINDOW):
                if vario_records[j].altitude_smoothed > maximum_thermal_peak:
                    maximum_thermal_peak = vario_records[j].altitude_smoothed
            
            if vario_records[i].altitude_smoothed == maximum_thermal_peak:
                vario_records[i].thermal_peak = True
                # Disqualify if associated with high climb rate (launch)
                if (vario_records[i].altitude_smoothed - vario_records[i - THERMAL_MAX_CLIMB_RATE_LOOKBACK].altitude_smoothed
                    > THERMAL_MAX_CLIMB_RATE_FPS * THERMAL_MAX_CLIMB_RATE_LOOKBACK):
                    vario_records[i].thermal_peak = False

def identify_launch_peaks(vario_records, session_records, session_number):
    """Identifies launch peaks using original logic"""
    for i in range(LAUNCH_MIN_CLIMB_RATE_LOOKBACK, len(vario_records) - LAUNCH_MIN_CLIMB_RATE_LOOKBACK):
        maximum_launch_peak = 0
        for j in range(i - LAUNCH_MIN_CLIMB_RATE_LOOKBACK, i):
            if vario_records[j].climb_rate > LAUNCH_MIN_CLIMB_RATE_FPS:
                maximum_launch_peak = vario_records[j].climb_rate
        if maximum_launch_peak > LAUNCH_MIN_CLIMB_RATE_FPS:
            vario_records[i].launch_peak_candidate = True
    
    for i in range(LAUNCH_MIN_CLIMB_RATE_LOOKBACK, len(vario_records) - LAUNCH_MIN_CLIMB_RATE_LOOKBACK):
        if not vario_records[i].launch_peak_candidate and vario_records[i - 1].launch_peak_candidate:
            vario_records[i].launch_peak = True
            session_records[session_number].launch_count += 1

def identify_trough_bottoms(vario_records, session_number):
    """Identifies trough bottoms using original logic"""
    for i in range(TROUGH_CANDIDATE_WINDOW, len(vario_records) - TROUGH_CANDIDATE_WINDOW):
        if (vario_records[i].altitude_smoothed < vario_records[i - TROUGH_CANDIDATE_WINDOW].altitude_smoothed and
            vario_records[i].altitude_smoothed < vario_records[i + TROUGH_CANDIDATE_WINDOW].altitude_smoothed):
            vario_records[i].trough_bottom_candidate = True
    
    for i in range(TROUGH_CANDIDATE_WINDOW, len(vario_records) - TROUGH_CANDIDATE_WINDOW):
        if vario_records[i].trough_bottom_candidate:
            minimum_trough_bottom = 10000
            for j in range(i - TROUGH_CANDIDATE_WINDOW, i + TROUGH_CANDIDATE_WINDOW):
                if vario_records[j].altitude_smoothed < minimum_trough_bottom:
                    minimum_trough_bottom = vario_records[j].altitude_smoothed
            
            if vario_records[i].altitude_smoothed == minimum_trough_bottom:
                vario_records[i].trough_bottom = True

def identify_caught_thermals(vario_records, session_records, session_number, thermal_records):
    """Identifies caught thermals using original logic"""
    thermal_index = 0
    last_trough_bottom_altitude = 0.0
    last_trough_bottom_timestamp = 0.0
    last_trough_bottom_index = 0
    i = len(vario_records) - 1
    
    session_duration = vario_records[len(vario_records) - 1].timestamp
    session_duration_hms = str(timedelta(seconds=int(session_duration)))
    session_records[session_number].session_duration = session_duration
    session_records[session_number].session_duration_hms = session_duration_hms
    
    # Work backwards in time from the end of the session
    while i > 0:
        if vario_records[i].thermal_peak:
            last_event_was_a_trough = False
            j = i
            while j > 0:
                j -= 1
                if vario_records[j].launch_peak and not last_event_was_a_trough:
                    # Mark caught thermal from launch peak to thermal peak
                    start_time = round(vario_records[j].timestamp, 1)
                    end_time = round(vario_records[i].timestamp, 1)
                    start_altitude = round(vario_records[j].altitude_smoothed, 1)
                    end_altitude = round(vario_records[i].altitude_smoothed, 1)
                    duration = round(end_time - start_time, 1)
                    altitude_gain = round(end_altitude - start_altitude, 1)
                    avg_climb_rate = round(altitude_gain / duration, 1) if duration > 0 else 0
                    if altitude_gain >= THERMAL_MINIMUM_GAIN_FT:
                        thermal_records.append({
                            'session_number': session_number,
                            'thermal_number': thermal_index,
                            'start_time': start_time,
                            'start_index': j,
                            'end_time': end_time,
                            'end_index': i,
                            'start_altitude': start_altitude,
                            'end_altitude': end_altitude,
                            'duration': duration,
                            'altitude_gain': altitude_gain,
                            'avg_climb_rate': avg_climb_rate
                        })
                        session_records[session_number].thermal_count += 1
                        session_records[session_number].total_thermal_altitude_gain += altitude_gain
                        session_records[session_number].total_thermal_duration += duration
                        thermal_index += 1
                    i = j
                    break
                
                elif vario_records[j].trough_bottom and last_event_was_a_trough:
                    if vario_records[j].altitude_smoothed > last_trough_bottom_altitude:
                        start_time = round(last_trough_bottom_timestamp, 1)
                        end_time = round(vario_records[i].timestamp, 1)
                        start_altitude = round(last_trough_bottom_altitude, 1)
                        end_altitude = round(vario_records[i].altitude_smoothed, 1)
                        duration = round(end_time - start_time, 1)
                        altitude_gain = round(end_altitude - start_altitude, 1)
                        avg_climb_rate = round(altitude_gain / duration, 1) if duration > 0 else 0
                        if altitude_gain >= THERMAL_MINIMUM_GAIN_FT:
                            thermal_records.append({
                                'session_number': session_number,
                                'thermal_number': thermal_index,
                                'start_time': start_time,
                                'start_index': last_trough_bottom_index,
                                'end_time': end_time,
                                'end_index': i,
                                'start_altitude': start_altitude,
                                'end_altitude': end_altitude,
                                'duration': duration,
                                'altitude_gain': altitude_gain,
                                'avg_climb_rate': avg_climb_rate
                            })
                            session_records[session_number].thermal_count += 1
                            session_records[session_number].total_thermal_altitude_gain += altitude_gain
                            session_records[session_number].total_thermal_duration += duration
                            thermal_index += 1
                        i = j
                        break
                    else:
                        last_trough_bottom_altitude = vario_records[j].altitude_smoothed
                        last_trough_bottom_timestamp = vario_records[j].timestamp
                        last_trough_bottom_index = j
                
                elif vario_records[j].thermal_peak and last_event_was_a_trough:
                    start_time = round(last_trough_bottom_timestamp, 1)
                    end_time = round(vario_records[i].timestamp, 1)
                    start_altitude = round(last_trough_bottom_altitude, 1)
                    end_altitude = round(vario_records[i].altitude_smoothed, 1)
                    duration = round(end_time - start_time, 1)
                    altitude_gain = round(end_altitude - start_altitude, 1)
                    avg_climb_rate = round(altitude_gain / duration, 1) if duration > 0 else 0
                    if altitude_gain >= THERMAL_MINIMUM_GAIN_FT:
                        thermal_records.append({
                            'session_number': session_number,
                            'thermal_number': thermal_index,
                            'start_time': start_time,
                            'start_index': last_trough_bottom_index,
                            'end_time': end_time,
                            'end_index': i,
                            'start_altitude': start_altitude,
                            'end_altitude': end_altitude,
                            'duration': duration,
                            'altitude_gain': altitude_gain,
                            'avg_climb_rate': avg_climb_rate
                        })
                        session_records[session_number].thermal_count += 1
                        session_records[session_number].total_thermal_altitude_gain += altitude_gain
                        session_records[session_number].total_thermal_duration += duration
                        thermal_index += 1
                    i = j + 1
                    break
                
                elif vario_records[j].launch_peak and last_event_was_a_trough:
                    start_time = round(last_trough_bottom_timestamp, 1)
                    end_time = round(vario_records[i].timestamp, 1)
                    start_altitude = round(last_trough_bottom_altitude, 1)
                    end_altitude = round(vario_records[i].altitude_smoothed, 1)
                    duration = round(end_time - start_time, 1)
                    altitude_gain = round(end_altitude - start_altitude, 1)
                    avg_climb_rate = round(altitude_gain / duration, 1) if duration > 0 else 0
                    if altitude_gain >= THERMAL_MINIMUM_GAIN_FT:
                        thermal_records.append({
                            'session_number': session_number,
                            'thermal_number': thermal_index,
                            'start_time': start_time,
                            'start_index': last_trough_bottom_index,
                            'end_time': end_time,
                            'end_index': i,
                            'start_altitude': start_altitude,
                            'end_altitude': end_altitude,
                            'duration': duration,
                            'altitude_gain': altitude_gain,
                            'avg_climb_rate': avg_climb_rate
                        })
                        session_records[session_number].thermal_count += 1
                        session_records[session_number].total_thermal_altitude_gain += altitude_gain
                        session_records[session_number].total_thermal_duration += duration
                        thermal_index += 1
                    i = j
                    break
                
                elif vario_records[j].trough_bottom:
                    last_event_was_a_trough = True
                    last_trough_bottom_timestamp = vario_records[j].timestamp
                    last_trough_bottom_altitude = vario_records[j].altitude_smoothed
                    last_trough_bottom_index = j
        i -= 1
    
    total_thermal_duration_hms = str(timedelta(seconds=int(session_records[session_number].total_thermal_duration)))
    session_records[session_number].total_thermal_duration_hms = total_thermal_duration_hms
    
    if session_records[session_number].launch_count != 0:
        session_records[session_number].thermal_launch_ratio = session_records[session_number].thermal_count / session_records[session_number].launch_count

def extract_model_name_from_header(header_data):
    """Extract aircraft model name from header packet if it contains model info"""
    if len(header_data) >= 13:
        # Check if 5th byte (index 4) is 0x01 or 0x02, indicating model name packet
        if header_data[4] in (0x01, 0x02):
            # Model name starts at 13th byte (index 12)
            model_bytes = header_data[12:]
            # Find null terminator
            null_index = model_bytes.find(0x00)
            if null_index != -1:
                model_bytes = model_bytes[:null_index]
            try:
                model_name = model_bytes.decode('ascii', errors='ignore').strip()
                # Validate: must be printable ASCII, at least 2 chars
                if model_name and len(model_name) >= 2 and model_name.isprintable():
                    return model_name
            except:
                pass
    return None

def process_header_packets(f, extract_model=False):
    """Reads and skips header packets until finding a data packet"""
    model_name = None
    while True:
        timestamp_bytes = f.read(4)
        if len(timestamp_bytes) < 4:
            return None if not extract_model else (None, model_name)
        timestamp = struct.unpack('<I', timestamp_bytes)[0]
        if timestamp == 0xFFFFFFFF:
            header_data = f.read(32)
            if len(header_data) < 32:
                return None if not extract_model else (None, model_name)
            
            # If we're extracting model name and haven't found it yet
            if extract_model and model_name is None:
                # Reconstruct full header packet (4 bytes timestamp + 32 bytes data)
                full_header = timestamp_bytes + header_data
                extracted_model = extract_model_name_from_header(full_header)
                if extracted_model:
                    model_name = extracted_model
        else:
            return timestamp if not extract_model else (timestamp, model_name)

def process_tlm_file(file_obj, is_metric=False):
    """
    Process a TLM file and return structured JSON data
    Follows original osprey.py logic as closely as possible
    """
    session_records = []
    thermal_records = []
    vario_records = []
    session_vario_records = []  # Stores vario records per session for altitude data
    session_number = -1
    aircraft_model = None
    
    def finalize_session():
        """Smooth and analyze the current session's vario records, then save them."""
        if len(vario_records) > 0:
            smooth_altitude_readings(vario_records)
            identify_thermal_peaks(vario_records, session_records, session_number)
            identify_launch_peaks(vario_records, session_records, session_number)
            identify_trough_bottoms(vario_records, session_number)
            identify_caught_thermals(vario_records, session_records, session_number, thermal_records)
        # Always save (even if empty) so index stays aligned with session_records
        session_vario_records.append(list(vario_records))

    def process_payload_packet(f):
        nonlocal session_number, vario_records
        
        # Move back 4 bytes and re-read the last timestamp
        f.seek(-4, 1)
        timestamp_offset_hundreths_bytes = f.read(4)
        timestamp_offset_hundreths = struct.unpack('<I', timestamp_offset_hundreths_bytes)[0]
        next_byte = f.read(1)
        
        session_start_timestamp_unix = None
        # If this is a 0x7C packet, get UTC time from it
        if next_byte[0] == 0x7C:
            f.read(7)
            session_start_timestamp_unix_bytes = f.read(4)
            session_start_timestamp_unix = struct.unpack('<I', session_start_timestamp_unix_bytes)[0]
            f.read(4)
        else:
            f.seek(-1, 1)  # Not a 0x7C packet, put the byte back
        
        vario_packet_count = 0
        
        while True:
            time_stamp_hundreths_bytes = f.read(4)
            
            # If EOF reached, process final session
            if len(time_stamp_hundreths_bytes) < 4:
                finalize_session()
                return True  # EOF
            
            time_stamp_hundreths = struct.unpack('<I', time_stamp_hundreths_bytes)[0]
            
            # Check if we've reached another header block
            if time_stamp_hundreths == 0xFFFFFFFF and len(vario_records) > 0:
                finalize_session()
            
            if time_stamp_hundreths == 0xFFFFFFFF:
                skipped = f.read(32)
                if len(skipped) < 32:
                    return True
                return False  # Continue to next session
            
            next_byte = f.read(1)
            if len(next_byte) < 1:
                return True
            
            # Check if it's a vario packet (0x40)
            if next_byte[0] == 0x40:
                if vario_packet_count % 10 == 0:  # Only record every 10th packet (1s samples)
                    # Check if this is the first vario packet
                    if vario_packet_count == 0:
                        session_number += 1
                        from datetime import timezone
                        if session_start_timestamp_unix:
                            session_start_utc = datetime.fromtimestamp(session_start_timestamp_unix, tz=timezone.utc)
                            session_start_local_datetime = session_start_utc
                        elif earliest_unix_ts:
                            # Use earliest known timestamp from this file as the date,
                            # but keep relative offset from session_records if available
                            session_start_local_datetime = datetime.fromtimestamp(earliest_unix_ts, tz=timezone.utc)
                        elif session_records:
                            session_start_local_datetime = session_records[-1].start_time
                        else:
                            session_start_local_datetime = datetime.now(timezone.utc)
                        session_start_local_date = session_start_local_datetime.date()
                        session_records.append(SessionRecord(session_start_local_datetime, session_start_local_date))
                        vario_records = []
                    
                    f.read(1)  # sID
                    altitude_bytes = f.read(2)
                    f.read(2)  # delta_250ms
                    f.read(2)  # delta_500ms
                    delta_1000ms_bytes = f.read(2)
                    f.read(6)  # remaining deltas
                    
                    altitude = struct.unpack('>H', altitude_bytes)[0] / 10.0 * M_TO_FT
                    delta_1000ms = struct.unpack('>h', delta_1000ms_bytes)[0] / 10.0 * M_TO_FT
                    # Handle 32-bit counter wraparound
                    raw_delta = time_stamp_hundreths - timestamp_offset_hundreths
                    if raw_delta < 0:
                        raw_delta += 0x100000000  # 2^32
                    delta_timestamp = raw_delta / 100.0
                    
                    if altitude < 1000:  # Only valid data
                        vario_records.append(VarioRecord(delta_timestamp, altitude, delta_1000ms))
                else:
                    f.read(15)
                vario_packet_count += 1
            else:
                f.read(15)
    
    # First pass: scan file for aircraft model name AND earliest valid Unix timestamp
    # The earliest timestamp will be used as fallback for sessions missing a 0x7C packet
    file_obj.seek(0)
    earliest_unix_ts = None

    def scan_for_metadata(f):
        nonlocal aircraft_model, earliest_unix_ts
        f.seek(-4, 1)
        f.read(4)  # re-read timestamp_offset (discard)
        next_byte = f.read(1)
        if next_byte[0] == 0x7C:
            f.read(7)
            ts_bytes = f.read(4)
            ts = struct.unpack('<I', ts_bytes)[0]
            f.read(4)
            if ts > 1000000000:  # sanity check: must be after year 2001
                if earliest_unix_ts is None or ts < earliest_unix_ts:
                    earliest_unix_ts = ts
        else:
            f.seek(-1, 1)
        # Skip rest of payload (read until next 0xFFFFFFFF or EOF)
        while True:
            b = f.read(4)
            if len(b) < 4:
                return True
            val = struct.unpack('<I', b)[0]
            if val == 0xFFFFFFFF:
                f.read(32)
                return False
            f.read(1)
            f.read(15)

    while True:
        result = process_header_packets(file_obj, extract_model=True)
        if result is None or result[0] is None:
            break
        timestamp, model = result
        if model and not aircraft_model:
            aircraft_model = model
        done = scan_for_metadata(file_obj)
        if done:
            break

    # Reset file for main processing
    file_obj.seek(0)
    
    # Main processing loop
    while True:
        timestamp = process_header_packets(file_obj)
        if timestamp is None:
            break
        
        quit_program = process_payload_packet(file_obj)
        if quit_program:
            break
    
    # Build response with session data
    # Filter out sessions with bogus durations (negative or > 24 hours)
    MAX_SESSION_DURATION = 86400  # 24 hours in seconds

    sessions = []
    for i, session_rec in enumerate(session_records):
        if not (0 < session_rec.session_duration <= MAX_SESSION_DURATION):
            continue

        # Get thermals for this session
        session_thermals = [t for t in thermal_records if t['session_number'] == i]

        # Build altitude data from the saved vario records for this session
        # session_vario_records[i] holds the smoothed records from the single pass
        altitude_data = []
        if i < len(session_vario_records):
            records = session_vario_records[i]
            thermal_start_times = set(t['start_time'] for t in session_thermals)
            thermal_end_times = set(t['end_time'] for t in session_thermals)
            altitude_data = [
                {
                    'timestamp': r.timestamp,
                    'altitude': round(r.altitude_smoothed / (M_TO_FT if is_metric else 1), 1),
                    'climb_rate': round(r.climb_rate / (M_TO_FT if is_metric else 1), 1),
                    'thermal_start': any(abs(r.timestamp - t) < 0.6 for t in thermal_start_times),
                    'thermal_end': any(abs(r.timestamp - t) < 0.6 for t in thermal_end_times),
                }
                for r in records
            ]

        sessions.append({
            'session_number': i,
            'start_time': session_rec.start_time,
            'duration_seconds': session_rec.session_duration,
            'launch_count': session_rec.launch_count,
            'thermal_count': session_rec.thermal_count,
            'total_thermal_gain': session_rec.total_thermal_altitude_gain,
            'total_thermal_duration': session_rec.total_thermal_duration,
            'thermal_launch_ratio': session_rec.thermal_launch_ratio,
            'altitude_data': altitude_data,
            'thermals': session_thermals,
            'aircraft_model': aircraft_model
        })

    return {
        'sessions': sessions,
        'total_thermals': sum(s['thermal_count'] for s in sessions)
    }
