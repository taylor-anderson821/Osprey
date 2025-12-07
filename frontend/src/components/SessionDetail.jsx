import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Scatter, ComposedChart, ReferenceArea } from 'recharts';
import { formatSessionDetailDate } from '../utils/dateFormatter';
import { formatAltitudeValue, getUnitLabel } from '../utils/units';

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
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }))];

  // Get current session's date
  const currentDate = new Date(session.start_time).toLocaleDateString('en-US', { 
    year: 'numeric', month: 'short', day: 'numeric' 
  });

  // Filter sessions by current date
  const sessionsOnCurrentDate = sessions.filter(s => {
    const sessDate = new Date(s.start_time).toLocaleDateString('en-US', { 
      year: 'numeric', month: 'short', day: 'numeric' 
    });
    return sessDate === currentDate;
  });

  // Handle date change
  const handleDateChange = (selectedDate) => {
    // Find first session on the selected date
    const sessionOnDate = sessions.find(s => {
      const sessDate = new Date(s.start_time).toLocaleDateString('en-US', { 
        year: 'numeric', month: 'short', day: 'numeric' 
      });
      return sessDate === selectedDate;
    });
    
    if (sessionOnDate) {
      const index = sessions.findIndex(s => s.id === sessionOnDate.id);
      onSessionChange(sessionOnDate.id, index);
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

  // Extract thermal start and end points from ThermalRecord data (convert to user's units)
  const thermalStarts = session.thermals.map(thermal => ({
    timestamp: thermal.start_time,
    altitude: formatAltitudeValue(thermal.start_altitude)
  }));

  const thermalEnds = session.thermals.map(thermal => ({
    timestamp: thermal.end_time,
    altitude: formatAltitudeValue(thermal.end_altitude)
  }));

  // Create a custom dot renderer that shows thermal markers
  const renderCustomDot = (props) => {
    const { cx, cy, payload } = props;
    
    // Check if this point is a thermal start
    const isThermalStart = thermalStarts.some(
      t => Math.abs(t.timestamp - payload.timestamp) < 0.5 && Math.abs(t.altitude - payload.altitude) < 1
    );
    
    // Check if this point is a thermal end
    const isThermalEnd = thermalEnds.some(
      t => Math.abs(t.timestamp - payload.timestamp) < 0.5 && Math.abs(t.altitude - payload.altitude) < 1
    );
    
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
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-6"
      >
        <ArrowLeft size={20} />
        Back to Sessions
      </button>

      <div className="bg-gray-800 rounded-lg shadow-md p-6 mb-6 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <select
                value={currentDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="bg-gray-700 text-gray-400 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 text-left"
              >
                {uniqueDates.map((date) => (
                  <option key={date} value={date}>
                    {date}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-2xl font-bold text-white">
              Session {session.sessionIndex !== undefined ? session.sessionIndex + 1 : ''} <span className="text-sm text-gray-400 font-normal">{new Date(session.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
            </p>
          </div>

          <div>
          {sessionsOnCurrentDate && sessionsOnCurrentDate.length > 1 && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-400">Jump to:</label>
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
            </div>
          )}
          </div>
        </div>

        {/* Metrics row - 56.25% width (75% of 75%) to align with chart */}
        <div className="w-9/16 mb-6" style={{ width: '56.25%', marginLeft: '1in' }}>
          <div className="flex justify-between">
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
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Chart - takes 4/5 width on large screens */}
          <div className="lg:col-span-4">
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
                  label={{ value: timeRange >= 3600 ? 'time (h:mm:ss)' : 'time (m:ss)', position: 'insideBottom', offset: -5 }}
                  tick={{ fontSize: 11 }}
                  allowDataOverflow={true}
                  scale="linear"
                />
                <YAxis 
                  label={{ value: `Altitude (${unitLabel})`, angle: -90, position: 'insideLeft' }}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip 
                  content={<CustomTooltip unitLabel={unitLabel} />}
                  isAnimationActive={false}
                  allowEscapeViewBox={{ x: false, y: false }}
                  cursor={{ stroke: '#666', strokeWidth: 1, strokeDasharray: '3 3' }}
                  shared={false}
                  trigger="axis"
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '10px' }}
                  iconType="line"
                  payload={[
                    { value: `Alt (${unitLabel})`, type: 'line', color: '#3b82f6' },
                    { value: 'Therm Start', type: 'circle', color: '#10b981' },
                    { value: 'Therm End', type: 'circle', color: '#ef4444' }
                  ]}
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

          {/* Thermal Summary - takes 1/5 width on large screens */}
          <div className="lg:col-span-1">
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
