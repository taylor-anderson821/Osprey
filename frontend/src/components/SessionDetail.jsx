import { ChevronLeft, ChevronRight, MoveUp, Wind } from 'lucide-react';
import { useState } from 'react';
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, ReferenceArea } from 'recharts';
import { formatSessionDetailDate } from '../utils/dateFormatter';
import { formatAltitudeValue, getUnitLabel, convertTemperature, getTempLabel, convertWindSpeed, getWindSpeedLabel } from '../utils/units';
import { WeatherIcon } from '../utils/weatherIcon';

const CustomTooltip = ({ active, payload, label, unitLabel }) => {
  if (active && payload && payload.length) {
    // Filter to only show the altitude line data, not scatter points
    const altitudeData = payload.find(p => p.dataKey === 'altitude' && p.payload.climb_rate !== undefined);
    if (altitudeData) {
      return (
        <div style={{ backgroundColor: 'white', border: '1px solid #ccc', padding: '10px' }}>
          <p style={{ margin: 0, fontSize: '12px' }}>{`Time: ${Math.round(label)} s`}</p>
          <p style={{ margin: 0, fontSize: '12px', color: '#3b82f6' }}>
            {`Altitude: ${Math.round(altitudeData.value)} ${unitLabel}`}
          </p>
        </div>
      );
    }
  }
  return null;
};

export default function SessionDetail({ session, sessions, onBack, onSessionChange }) {
  const [hoveredThermal, setHoveredThermal] = useState(null);
  const unitLabel = getUnitLabel();

  const formatDate = formatSessionDetailDate;

  // Get unique dates from all sessions
  const uniqueDates = [...new Set(sessions.map(s => {
    const date = new Date(s.start_time);
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
  }))];

  // Get current session's date — same format as uniqueDates
  const currentDate = new Date(session.start_time).toLocaleDateString('en-US', {
    month: '2-digit', day: '2-digit', year: '2-digit'
  });

  // Filter sessions by current date
  const sessionsOnCurrentDate = sessions.filter(s =>
    new Date(s.start_time).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }) === currentDate
  );

  // Handle date change
  const handleDateChange = (selectedDate) => {
    const sessionOnDate = sessions.find(s =>
      new Date(s.start_time).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }) === selectedDate
    );
    
    if (sessionOnDate) {
      const index = sessions.findIndex(s => s.id === sessionOnDate.id);
      onSessionChange(sessionOnDate.id, index);
    }
  };

  const handlePreviousSession = () => {
    if (session.sessionIndex > 0) {
      const prevSession = sessions[session.sessionIndex - 1];
      onSessionChange(prevSession.id, session.sessionIndex - 1);
    }
  };

  const handleNextSession = () => {
    if (session.sessionIndex < sessions.length - 1) {
      const nextSession = sessions[session.sessionIndex + 1];
      onSessionChange(nextSession.id, session.sessionIndex + 1);
    }
  };

  const formatDuration = (seconds) => {
    if (seconds < 60) {
      return `${Math.floor(seconds)}s`;
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  const formatDurationHMS = (seconds) => {
    if (seconds < 60) {
      return `${Math.floor(seconds)}s`;
    }
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (seconds >= 3600) {
      return `${hours}h ${mins}m ${secs}s`;
    } else {
      return `${mins}m ${secs}s`;
    }
  };

  // Prepare chart data - altitude field contains altitude_smoothed from backend (in feet)
  // Convert to user's selected units
  const chartData = session.altitude_data.map(point => ({
    timestamp: point.timestamp,
    altitude: formatAltitudeValue(point.altitude),
    climb_rate: point.climb_rate
  }));

  // Build sets of thermal start/end timestamps for fast lookup
  const thermalStartTimes = new Set(session.thermals.map(t => t.start_time));
  const thermalEndTimes = new Set(session.thermals.map(t => t.end_time));

  // Create a custom dot renderer that shows thermal markers
  // Match by timestamp only (within 0.6s tolerance to handle float precision between passes)
  const renderCustomDot = (props) => {
    const { cx, cy, payload } = props;
    
    const isThermalStart = [...thermalStartTimes].some(t => Math.abs(t - payload.timestamp) < 0.6);
    const isThermalEnd = [...thermalEndTimes].some(t => Math.abs(t - payload.timestamp) < 0.6);
    
    if (isThermalStart) {
      return <circle cx={cx} cy={cy} r={6} fill="#10b981" stroke="none" />;
    }
    if (isThermalEnd) {
      return <circle cx={cx} cy={cy} r={6} fill="#ef4444" stroke="none" />;
    }
    return null;
  };

  // Calculate X-axis domain from altitude data only (not scatter points)
  const minTime = Math.min(...chartData.map(d => d.timestamp));
  const maxTime = Math.max(...chartData.map(d => d.timestamp));
  
  // Calculate evenly spaced tick marks
  const timeRange = maxTime - minTime;
  const tickInterval = timeRange > 600 ? 100 : timeRange > 300 ? 50 : timeRange > 100 ? 20 : 10;
  const startTick = Math.ceil(minTime / tickInterval) * tickInterval;
  const ticks = [];
  for (let t = startTick; t <= maxTime; t += tickInterval) {
    ticks.push(t);
  }

  // Calculate Y-axis tick marks with round numbers
  const minAltitude = Math.min(...chartData.map(d => d.altitude));
  const maxAltitude = Math.max(...chartData.map(d => d.altitude));
  const altitudeRange = maxAltitude - minAltitude;
  
  // Determine appropriate tick interval based on range
  let yTickInterval;
  if (altitudeRange <= 100) {
    yTickInterval = 25;
  } else if (altitudeRange <= 500) {
    yTickInterval = 50;
  } else if (altitudeRange <= 1000) {
    yTickInterval = 100;
  } else if (altitudeRange <= 2500) {
    yTickInterval = 250;
  } else {
    yTickInterval = 500;
  }
  
  // Generate Y-axis ticks
  const minYTick = Math.floor(minAltitude / yTickInterval) * yTickInterval;
  const maxYTick = Math.ceil(maxAltitude / yTickInterval) * yTickInterval;
  const yTicks = [];
  for (let y = minYTick; y <= maxYTick; y += yTickInterval) {
    yTicks.push(y);
  }

  // Format time as m:ss or h:mm:ss
  const formatTimeAxis = (seconds) => {
    const totalSeconds = Math.floor(seconds);
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    
    if (timeRange >= 3600) {
      // Show h:mm:ss for sessions over an hour
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      // Show m:ss for sessions under an hour
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
  };

  return (
    <div>
      <div className="bg-gray-800 rounded-lg shadow-md p-6 mb-6 border border-gray-700">
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <select
              value={currentDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 text-left"
            >
              {uniqueDates.map((date) => (
                <option key={date} value={date}>
                  {date}
                </option>
              ))}
            </select>
            
            {/* Session Navigation */}
            <div className="flex items-center gap-1">
              <button
                onClick={handlePreviousSession}
                disabled={session.sessionIndex === 0}
                className="p-1 text-white hover:text-blue-400 disabled:text-gray-500 disabled:cursor-not-allowed"
                title="Previous session"
              >
                <ChevronLeft size={20} />
              </button>
              
              {sessionsOnCurrentDate && sessionsOnCurrentDate.length > 1 && (
                <select
                  value={session.sessionIndex}
                  onChange={(e) => {
                    const index = parseInt(e.target.value);
                    const selectedSession = sessions[index];
                    if (selectedSession) {
                      onSessionChange(selectedSession.id, index);
                    }
                  }}
                  className="bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                >
                  {sessionsOnCurrentDate.map((sess, dayIndex) => {
                    const sessIndex = sessions.findIndex(s => s.id === sess.id);
                    return (
                      <option key={sessIndex} value={sessIndex}>
                        Session {dayIndex + 1}
                      </option>
                    );
                  })}
                </select>
              )}
              
              <button
                onClick={handleNextSession}
                disabled={session.sessionIndex === sessions.length - 1}
                className="p-1 text-white hover:text-blue-400 disabled:text-gray-500 disabled:cursor-not-allowed"
                title="Next session"
              >
                <ChevronRight size={20} />
              </button>
            </div>
            
            <span className="text-sm text-white font-normal ml-2">
              {new Date(session.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          
          {/* Aircraft Model - if available */}
          {session.aircraft_model && (
            <div className="text-base sm:text-2xl font-bold text-white">
              {session.aircraft_model}
            </div>
          )}
          {/* Flying Location + Weather inline */}
          {(session.location || session.weather_temperature_f != null) && (
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
              {session.location && <span>{session.location.name}</span>}
              {session.weather_temperature_f != null && (
                <>
                  {session.weather_conditions && <WeatherIcon condition={session.weather_conditions} />}
                  <span className="text-gray-300">{convertTemperature(session.weather_temperature_f)}{getTempLabel()}</span>
                  {session.weather_wind_speed_mph != null && (
                    <span className="flex items-center gap-1 text-gray-300">
                      <Wind size={14} className="text-gray-400" />
                      {convertWindSpeed(session.weather_wind_speed_mph)} {getWindSpeedLabel()}
                      {session.weather_wind_direction && (
                        <MoveUp
                          size={14}
                          className="text-blue-300"
                          style={{ transform: `rotate(${({'N':0,'NNE':22.5,'NE':45,'ENE':67.5,'E':90,'ESE':112.5,'SE':135,'SSE':157.5,'S':180,'SSW':202.5,'SW':225,'WSW':247.5,'W':270,'WNW':292.5,'NW':315,'NNW':337.5}[session.weather_wind_direction] ?? 0) + 180}deg)` }}
                          title={session.weather_wind_direction}
                        />
                      )}
                    </span>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Chart + stats - takes 9/12 width on large screens */}
          <div className="lg:col-span-9">
            {/* Metrics row centered over chart */}
            <div className="flex flex-wrap justify-center gap-x-12 gap-y-3 mb-4">
              <div className="text-center">
                <div className="text-sm text-gray-400">Duration</div>
                <div className="text-xl font-bold text-white">{formatDurationHMS(session.duration_seconds)}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-400">Launches</div>
                <div className="text-xl font-bold text-white">{session.launch_count}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-400">Thermals</div>
                <div className="text-xl font-bold text-white">{session.thermal_count}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-400">Thermal Gain</div>
                <div className="text-xl font-bold text-white">{formatAltitudeValue(session.total_thermal_gain).toLocaleString()} {unitLabel}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-400">Thermal Duration</div>
                <div className="text-xl font-bold text-white">{formatDurationHMS(session.total_thermal_duration)}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-400">Thermal Duration (%)</div>
                <div className="text-xl font-bold text-white">
                  {session.duration_seconds > 0
                    ? ((session.total_thermal_duration / session.duration_seconds) * 100).toFixed(1)
                    : '0.0'}%
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
            <div style={{ minWidth: '560px' }}>
            <ResponsiveContainer width="100%" height={450}>
              <ComposedChart 
                data={chartData} 
                margin={{ top: 10, right: 40, left: 10, bottom: 30 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="timestamp" 
                  type="number"
                  domain={[minTime, maxTime]}
                  ticks={ticks}
                  tickFormatter={formatTimeAxis}
                  label={{ value: timeRange >= 3600 ? 'time (h:mm:ss)' : 'time', position: 'insideBottom', offset: -5, style: { fill: 'white' } }}
                  tick={{ fontSize: 11, fill: 'white' }}
                  allowDataOverflow={true}
                  scale="linear"
                  stroke="white"
                />
                <YAxis 
                  label={{ value: `Altitude (${unitLabel})`, angle: -90, position: 'insideLeft', style: { fill: 'white' } }}
                  tick={{ fontSize: 11, fill: 'white' }}
                  ticks={yTicks}
                  domain={[minYTick, maxYTick]}
                  stroke="white"
                />
                <Tooltip 
                  content={<CustomTooltip unitLabel={unitLabel} />}
                  isAnimationActive={false}
                  allowEscapeViewBox={{ x: false, y: false }}
                  cursor={{ stroke: '#666', strokeWidth: 1, strokeDasharray: '3 3' }}
                  shared={false}
                  trigger="axis"
                />
<Line 
                  type="linear"
                  dataKey="altitude" 
                  stroke="#3b82f6" 
                  strokeWidth={1.5}
                  dot={renderCustomDot}
                  activeDot={{ r: 4 }}
                  name={`Alt (${unitLabel})`}
                  isAnimationActive={false}
                  connectNulls={false}
                />
                {hoveredThermal && (
                  <ReferenceArea
                    x1={hoveredThermal.start_time}
                    x2={hoveredThermal.end_time}
                    fill="#fbbf24"
                    fillOpacity={0.3}
                    strokeOpacity={0}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
            </div>
          </div>
          </div>

          {/* Thermal Summary - takes 3/12 width on large screens */}
          <div className="lg:col-span-3">
            <h3 className="text-lg font-semibold mb-4 text-white">Thermals</h3>
              
              {session.thermals.length === 0 ? (
                <p className="text-gray-400 text-sm">No thermals detected</p>
              ) : (
                <div className="overflow-y-auto" style={{ maxHeight: '450px' }}>
                <table className="text-xs w-full">
                  <thead className="sticky top-0 bg-gray-800">
                    <tr className="border-b border-gray-700">
                      <th className="text-right py-1 px-1 font-semibold text-gray-300">#</th>
                      <th className="text-right py-1 px-1 font-semibold text-gray-300">Start ({unitLabel})</th>
                      <th className="text-right py-1 px-1 font-semibold text-gray-300">End ({unitLabel})</th>
                      <th className="text-right py-1 px-1 font-semibold text-gray-300">Gain ({unitLabel})</th>
                      <th className="text-right py-1 px-1 font-semibold text-gray-300">Duration</th>
                      <th className="text-right py-1 px-1 font-semibold text-gray-300">Avg. Clmb Rt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...session.thermals].reverse().map((thermal, index) => (
                      <tr 
                        key={thermal.id} 
                        className="border-b border-gray-700 hover:bg-gray-700 cursor-pointer"
                        onMouseEnter={() => setHoveredThermal(thermal)}
                        onMouseLeave={() => setHoveredThermal(null)}
                      >
                        <td className="py-1 px-1 text-white text-right">{index + 1}</td>
                        <td className="py-1 px-1 text-gray-300 text-right">{Math.round(formatAltitudeValue(thermal.start_altitude))}</td>
                        <td className="py-1 px-1 text-gray-300 text-right">{Math.round(formatAltitudeValue(thermal.end_altitude))}</td>
                        <td className="py-1 px-1 font-semibold text-green-400 text-right">
                          +{Math.round(formatAltitudeValue(thermal.altitude_gain))}
                        </td>
                        <td className="py-1 px-1 text-gray-300 text-right">{formatDuration(thermal.duration)}</td>
                        <td className="py-1 px-1 text-gray-300 text-right">
                          {thermal.duration > 0 ? (formatAltitudeValue(thermal.altitude_gain) / thermal.duration).toFixed(1) : '0.0'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              )}
          </div>
        </div>
      </div>

    </div>
  );
}
