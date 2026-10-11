import { ChevronLeft, ChevronRight, MoveUp, Wind } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, ReferenceArea } from 'recharts';
import { formatSessionDetailDate } from '../utils/dateFormatter';
import { formatAltitudeValue, getUnitLabel, convertTemperature, getTempLabel, convertWindSpeed, getWindSpeedLabel } from '../utils/units';
import { WeatherIcon } from '../utils/weatherIcon';

const tooltipBoxStyle = {
  backgroundColor: '#111827',
  border: '1px solid #374151',
  borderRadius: '8px',
  padding: '8px 10px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
};

const formatTooltipTime = (label) => {
  const t = Math.round(label);
  const m = Math.floor(t / 60);
  const s = t % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const CustomTooltip = ({ active, payload, label, unitLabel }) => {
  if (active && payload && payload.length) {
    // Filter to only show the altitude line data, not scatter points
    const altitudeData = payload.find(p => p.dataKey === 'altitude' && p.payload.climb_rate !== undefined);
    if (altitudeData) {
      return (
        <div style={tooltipBoxStyle}>
          <p style={{ margin: 0, marginBottom: '3px', fontSize: '12px', color: '#9ca3af' }}>{formatTooltipTime(label)}</p>
          <p style={{ margin: 0, fontSize: '12px', color: '#60a5fa' }}>
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
  const [zoomDomain, setZoomDomain] = useState(null);
  const [refAreaLeft, setRefAreaLeft] = useState(null);
  const [refAreaRight, setRefAreaRight] = useState(null);
  const [isPanning, setIsPanning] = useState(false);
  const chartWrapperRef = useRef(null);
  // Pan-gesture snapshot (pixel start position, domain, plot width at drag
  // start) lives in a ref rather than state: it's read from window-level
  // listeners and must never trigger its own re-render.
  const panStateRef = useRef(null);
  const unitLabel = getUnitLabel();

  // Reset any active zoom/pan when switching sessions
  useEffect(() => {
    setZoomDomain(null);
    setRefAreaLeft(null);
    setRefAreaRight(null);
    setIsPanning(false);
    panStateRef.current = null;
  }, [session.id]);

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
    climb_rate: point.climb_rate,
    launch_peak: point.launch_peak
  }));

  // Build sets of thermal start/end timestamps for fast lookup
  const thermalStartTimes = new Set(session.thermals.map(t => t.start_time));
  const thermalEndTimes = new Set(session.thermals.map(t => t.end_time));

  // Create a custom dot renderer that shows thermal + launch markers
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
    if (payload.launch_peak) {
      return <circle cx={cx} cy={cy} r={6} fill="#fbbf24" stroke="none" />;
    }
    return null;
  };

  // Calculate X-axis domain from altitude data only (not scatter points)
  const minTime = Math.min(...chartData.map(d => d.timestamp));
  const maxTime = Math.max(...chartData.map(d => d.timestamp));

  // When zoomed, restrict the displayed domain and both axes' tick ranges to
  // the selected window instead of the full session.
  const displayMinTime = zoomDomain ? zoomDomain[0] : minTime;
  const displayMaxTime = zoomDomain ? zoomDomain[1] : maxTime;
  const visibleData = zoomDomain
    ? chartData.filter(d => d.timestamp >= displayMinTime && d.timestamp <= displayMaxTime)
    : chartData;

  // Calculate evenly spaced tick marks. Snapped to whole minutes (1, 2, 5, or
  // 10 min) at the full session view; finer second-based steps kick in once
  // zoomed into a short enough window that minute ticks would be too sparse.
  const timeRange = displayMaxTime - displayMinTime;
  const tickInterval = timeRange > 3000 ? 600
    : timeRange > 1200 ? 300
    : timeRange > 600 ? 120
    : timeRange > 240 ? 60
    : timeRange > 90 ? 30
    : timeRange > 40 ? 15
    : timeRange > 20 ? 10
    : 5;
  const startTick = Math.ceil(displayMinTime / tickInterval) * tickInterval;
  const ticks = [];
  for (let t = startTick; t <= displayMaxTime; t += tickInterval) {
    ticks.push(t);
  }

  // Calculate Y-axis tick marks with round numbers
  const minAltitude = Math.min(...(visibleData.length ? visibleData : chartData).map(d => d.altitude));
  const maxAltitude = Math.max(...(visibleData.length ? visibleData : chartData).map(d => d.altitude));
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

  // Drag-to-zoom on the altitude chart. Once zoomed, plain drag pans instead;
  // shift+drag draws a new zoom selection to zoom in further.
  //
  // Panning tracks raw pixel movement from the native mouse event rather than
  // Recharts' activeLabel: activeLabel snaps to the nearest data sample AND is
  // computed against the live axis domain, so once the domain itself starts
  // moving (as it does every frame of a pan), the same pixel position maps to
  // a different snapped value on the next frame — a feedback loop that reads
  // as jitter. Freezing a pixel-to-time scale at drag start avoids that.
  const handleZoomMouseDown = (chartState, domEvent) => {
    if (!chartState || chartState.activeLabel == null) return;
    if (zoomDomain && !domEvent?.shiftKey) {
      const plotWidth = chartWrapperRef.current?.clientWidth;
      if (plotWidth) {
        panStateRef.current = {
          startClientX: domEvent.clientX,
          startDomain: zoomDomain,
          plotWidth,
        };
        setIsPanning(true);
      }
      return;
    }
    setRefAreaLeft(chartState.activeLabel);
  };

  const handleZoomMouseMove = (chartState) => {
    if (isPanning) return; // handled by the window-level listener below
    if (!chartState || chartState.activeLabel == null) return;
    if (refAreaLeft != null) {
      setRefAreaRight(chartState.activeLabel);
    }
  };

  const handleZoomMouseUp = () => {
    if (isPanning) return; // handled by the window-level listener below
    if (refAreaLeft != null && refAreaRight != null && refAreaLeft !== refAreaRight) {
      const [left, right] = [refAreaLeft, refAreaRight].sort((a, b) => a - b);
      setZoomDomain([left, right]);
    }
    setRefAreaLeft(null);
    setRefAreaRight(null);
  };

  const handleResetZoom = () => {
    setZoomDomain(null);
    setRefAreaLeft(null);
    setRefAreaRight(null);
    setIsPanning(false);
    panStateRef.current = null;
  };

  // While panning, track the drag on window listeners (not Recharts' bounded
  // mouse handlers) so it keeps working even if the cursor leaves the chart,
  // and so the pixel-to-time scale frozen at drag start never gets recomputed
  // mid-gesture.
  useEffect(() => {
    if (!isPanning) return;

    const handleWindowMouseMove = (e) => {
      const pan = panStateRef.current;
      if (!pan) return;
      const deltaPx = e.clientX - pan.startClientX;
      const width = pan.startDomain[1] - pan.startDomain[0];
      const deltaData = (deltaPx / pan.plotWidth) * width;
      let newStart = pan.startDomain[0] - deltaData;
      let newEnd = pan.startDomain[1] - deltaData;
      if (newStart < minTime) {
        newStart = minTime;
        newEnd = minTime + width;
      }
      if (newEnd > maxTime) {
        newEnd = maxTime;
        newStart = maxTime - width;
      }
      setZoomDomain([newStart, newEnd]);
    };

    const handleWindowMouseUp = () => {
      panStateRef.current = null;
      setIsPanning(false);
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [isPanning, minTime, maxTime]);

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
            <div style={{ minWidth: '560px' }} ref={chartWrapperRef}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] uppercase tracking-wide text-gray-400">Altitude ({unitLabel})</span>
              <div className="flex items-center gap-3 text-[11px] text-gray-400">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />Thermal start</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />Thermal end</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />Launch peak</span>
                {zoomDomain && (
                  <span className="text-gray-500">Drag to pan &middot; Shift+drag to zoom &middot; double-click to reset</span>
                )}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={450} style={{ cursor: zoomDomain ? (isPanning ? 'grabbing' : 'grab') : 'crosshair' }}>
              <ComposedChart
                data={chartData}
                margin={{ top: 10, right: 0, left: 0, bottom: 30 }}
                onMouseDown={handleZoomMouseDown}
                onMouseMove={handleZoomMouseMove}
                onMouseUp={handleZoomMouseUp}
                onDoubleClick={handleResetZoom}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="timestamp"
                  type="number"
                  domain={[displayMinTime, displayMaxTime]}
                  ticks={ticks}
                  tickFormatter={formatTimeAxis}
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  allowDataOverflow={true}
                  scale="linear"
                  stroke="#4b5563"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  ticks={yTicks}
                  domain={[minYTick, maxYTick]}
                  stroke="#4b5563"
                />
                {!isPanning && (
                  <Tooltip
                    content={<CustomTooltip unitLabel={unitLabel} />}
                    isAnimationActive={false}
                    allowEscapeViewBox={{ x: false, y: false }}
                    cursor={{ stroke: '#9ca3af', strokeWidth: 1, strokeDasharray: '3 3' }}
                    shared={false}
                    trigger="axis"
                  />
                )}
<Line
                  type="linear"
                  dataKey="altitude"
                  stroke="#60a5fa"
                  strokeWidth={2}
                  dot={renderCustomDot}
                  activeDot={{ r: 4, fill: '#60a5fa', stroke: '#1f2937', strokeWidth: 2 }}
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
                {refAreaLeft != null && refAreaRight != null && (
                  <ReferenceArea
                    x1={refAreaLeft}
                    x2={refAreaRight}
                    fill="#60a5fa"
                    fillOpacity={0.15}
                    stroke="#60a5fa"
                    strokeOpacity={0.5}
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
