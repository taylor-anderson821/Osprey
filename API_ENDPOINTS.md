# Osprey Flight Analytics - API Endpoints Reference

## Base URL
- Development: `http://localhost:8000`
- Production: (Configure via VITE_API_URL environment variable)

## Flight Session Endpoints

### Upload TLM File
```
POST /api/upload
Content-Type: multipart/form-data

Body: file (TLM file)
Response: { message, session_ids[] }
```

### Get All Sessions
```
GET /api/sessions?skip=0&limit=50
Response: SessionSummary[]
```

### Get Session Detail
```
GET /api/sessions/{session_id}
Response: SessionDetail (includes altitude_data and thermals)
```

### Delete Session
```
DELETE /api/sessions/{session_id}
Response: { message }
```

### Get Daily Summary
```
GET /api/daily-summary
Response: DailySummary[] (aggregated by date)
```

## User Profile Endpoints

### Get User Profile
```
GET /api/profile
Response: {
  id, email, first_name, last_name, 
  photo_url, home_location_id, home_location, created_at
}
```

### Update User Profile
```
PUT /api/profile
Content-Type: application/json

Body: {
  first_name?: string,
  last_name?: string,
  photo_url?: string,
  home_location_id?: number
}
Response: UserProfileResponse
```

## Flying Location Endpoints

### Get Flying Locations
```
GET /api/locations?approved_only=true
Response: FlyingLocationResponse[]

Query Parameters:
- approved_only: "true" | "false" (default: "true")
```

### Submit New Location
```
POST /api/locations
Content-Type: application/json

Body: {
  name: string,
  latitude: number,
  longitude: number
}
Response: FlyingLocationResponse (approved: false)
```

### Approve Location (Admin)
```
PUT /api/locations/{location_id}/approve
Response: { message: "Location approved" }
```

## Health Check
```
GET /health
Response: { status: "healthy" }
```

## Data Models

### SessionSummary
```typescript
{
  id: number
  start_time: datetime
  duration_seconds: number
  launch_count: number
  thermal_count: number
  total_thermal_gain: number
  total_thermal_duration: number
  thermal_launch_ratio: number
}
```

### SessionDetail (extends SessionSummary)
```typescript
{
  ...SessionSummary,
  altitude_data: Array<{time: number, altitude: number}>,
  thermals: ThermalResponse[]
}
```

### ThermalResponse
```typescript
{
  id: number
  session_id: number
  thermal_number: number
  start_time: number
  end_time: number
  start_altitude: number
  end_altitude: number
  duration: number
  altitude_gain: number
  avg_climb_rate: number
}
```

### DailySummary
```typescript
{
  date: datetime
  launch_count: number
  thermal_count: number
  total_thermal_gain: number
  total_thermal_duration: number
  session_duration: number
  thermal_launch_ratio: number
}
```

### UserProfileResponse
```typescript
{
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  photo_url: string | null
  home_location_id: number | null
  home_location: FlyingLocationResponse | null
  created_at: datetime
}
```

### FlyingLocationResponse
```typescript
{
  id: number
  name: string
  latitude: number
  longitude: number
  approved: boolean
  created_at: datetime
}
```

## Authentication
Currently uses hardcoded `user_id = "demo_user"` for all requests.
Future implementation will use JWT tokens or session-based auth.

## Error Responses
```typescript
{
  detail: string  // Error message
}
```

Common HTTP Status Codes:
- 200: Success
- 400: Bad Request (invalid input)
- 404: Not Found
- 500: Internal Server Error
