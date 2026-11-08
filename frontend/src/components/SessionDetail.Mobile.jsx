import { ChevronLeft, ChevronRight, Wind, MoveUp } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, ReferenceArea } from 'recharts';
import { formatAltitudeValue, getUnitLabel, convertTemperature, getTempLabel, convertWindSpeed, getWindSpeedLabel } from '../utils/units';
import { WeatherIcon } from '../utils/weatherIcon';

const CustomTooltip = ({ active, payload, label, unitLabel }) => {
  if (active && payload && payload.length) {
    const altitudeData = payload.find(p => p.dataKey === 'altitude' && p.payload.climb_rate !== undefined);
    if (altitudeData) {
      return (
        <div style={{ backgroundColor: 'white', border: '1px solid #ccc', padding: '8px' }}>
          <p style={{ margin: 0, fontSize: '11px' }}>{`${Math.round(label)}s`}</p>
          <p style={{ margin: 0, fontSize: '11px', color: '#3b82f6' }}>
            {`${Math.round(altitudeData.value)} ${unitLabel}`}
          </p>
        </div>
      );
    }
  }
  return null;
};

export default function SessionDetailMobile({ session, sessions, onBack, onSessionChange }) {
  const [hoveredThermal, setHoveredThermal] = useState(null);
  const [zoomDomain, setZoomDomain] = useState(null);
  const [isZoomTouchActive, setIsZoomTouchActive] = useState(false);
  const unitLabel = getUnitLabel();
  const touchStartX = useRef(null);
  const chartInnerRef = useRef(null);
  const pinchStateRef = useRef(null);
  const panStateRef = useRef(null);
  const tapStartRef = useRef(null);
  const lastTapRef = useRef(0);

  // Reset any active zoom/pan when switching sessions
  useEffect(() => {
    setZoomDomain(null);
    setIsZoomTouchActive(false);
    pinchStateRef.current = null;
    panStateRef.current = null;
  }, [session.id]);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 50) return;
    if (dx < 0) handleNextSession();
    else handlePreviousSession();
  };

  const handlePreviousSession = () => {
    if (session.sessionIndex > 0) {
      const prev = sessions[session.sessionIndex - 1];
      onSessionChange(prev.id, session.sessionIndex - 1);
    }
  };

  const handleNextSession = () => {
    if (session.sessionIndex < sessions.length - 1) {
      const next = sessions[session.sessionIndex + 1];
      onSessionChange(next.id, session.sessionIndex + 1);
    }
  };

  const formatDuration = (seconds) => {
    if (seconds < 60) return `${Math.floor(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  const formatDurationHMS = (seconds) => {
    if (seconds < 60) return `${Math.floor(seconds)}s`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (seconds >= 3600) return `${hours}h ${mins}m`;
    return `${mins}m ${secs}s`;
  };

  const chartData = session.altitude_data.map(point => ({
    timestamp: point.timestamp,
    altitude: formatAltitudeValue(point.altitude),
    climb_rate: point.climb_rate,
    launch_peak: point.launch_peak,
  }));

  const thermalStartTimes = new Set(session.thermals.map(t => t.start_time));
  const thermalEndTimes = new Set(session.thermals.map(t => t.end_time));

  const renderCustomDot = (props) => {
    const { cx, cy, payload } = props;
    const isThermalStart = [...thermalStartTimes].some(t => Math.abs(t - payload.timestamp) < 0.6);
    const isThermalEnd = [...thermalEndTimes].some(t => Math.abs(t - payload.timestamp) < 0.6);
    const isLaunchPeak = payload.launch_peak;

    // A launch that caught a thermal immediately is both a launch peak and a
    // thermal start/end at the same sample — show both as a ring + fill
    // instead of letting one color hide the other.
    if (isLaunchPeak && (isThermalStart || isThermalEnd)) {
      const ringColor = isThermalStart ? '#10b981' : '#ef4444';
      return (
        <g>
          <circle cx={cx} cy={cy} r={5} fill="none" stroke={ringColor} strokeWidth={1.5} />
          <circle cx={cx} cy={cy} r={2} fill="#fbbf24" stroke="none" />
        </g>
      );
    }
    if (isThermalStart) return <circle cx={cx} cy={cy} r={3} fill="#10b981" stroke="none" />;
    if (isThermalEnd) return <circle cx={cx} cy={cy} r={3} fill="#ef4444" stroke="none" />;
    if (isLaunchPeak) return <circle cx={cx} cy={cy} r={3} fill="#fbbf24" stroke="none" />;
    return null;
  };

  const minTime = Math.min(...chartData.map(d => d.timestamp));
  const maxTime = Math.max(...chartData.map(d => d.timestamp));
  const fullTimeRange = maxTime - minTime;

  // When zoomed (pinch), restrict the displayed domain and both axes' tick
  // ranges to the pinched window instead of the full session.
  const displayMinTime = zoomDomain ? zoomDomain[0] : minTime;
  const displayMaxTime = zoomDomain ? zoomDomain[1] : maxTime;
  const visibleData = zoomDomain
    ? chartData.filter(d => d.timestamp >= displayMinTime && d.timestamp <= displayMaxTime)
    : chartData;

  const timeRange = displayMaxTime - displayMinTime;
  const tickIntervalSec = timeRange > 3600 ? 600
    : timeRange > 1800 ? 300
    : timeRange > 600 ? 120
    : timeRange > 240 ? 60
    : timeRange > 90 ? 30
    : timeRange > 40 ? 15
    : timeRange > 20 ? 10
    : 5;
  const startTick = Math.ceil(displayMinTime / tickIntervalSec) * tickIntervalSec;
  const ticks = [];
  for (let t = startTick; t <= displayMaxTime; t += tickIntervalSec) ticks.push(t);

  const minAltitude = Math.min(...(visibleData.length ? visibleData : chartData).map(d => d.altitude));
  const maxAltitude = Math.max(...(visibleData.length ? visibleData : chartData).map(d => d.altitude));
  const altitudeRange = maxAltitude - minAltitude;
  let yTickInterval = altitudeRange <= 100 ? 25 : altitudeRange <= 500 ? 50 : altitudeRange <= 1000 ? 100 : altitudeRange <= 2500 ? 250 : 500;
  const minYTick = Math.floor(minAltitude / yTickInterval) * yTickInterval;
  const maxYTick = Math.ceil(maxAltitude / yTickInterval) * yTickInterval;
  const yTicks = [];
  for (let y = minYTick; y <= maxYTick; y += yTickInterval) yTicks.push(y);

  const formatTimeAxis = (seconds) => {
    if (tickIntervalSec < 60) {
      const m = Math.floor(seconds / 60);
      const s = Math.round(seconds % 60);
      return `${m}:${s.toString().padStart(2, '0')}`;
    }
    return `${Math.round(seconds / 60)}m`;
  };

  const getTouchDistance = (touches) =>
    Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
  const getTouchMidX = (touches) => (touches[0].clientX + touches[1].clientX) / 2;

  // Pinch-to-zoom + single-finger pan (once zoomed) on the altitude chart.
  // Mirrors the desktop drag-to-zoom/pan feature but adapted to touch:
  // two fingers pinch to zoom, one finger pans once zoomed, double-tap
  // resets. Must stopPropagation so these gestures don't also trigger the
  // outer single-finger session-swipe handler.
  const handleChartTouchStart = (e) => {
    if (e.touches.length === 2) {
      e.stopPropagation();
      const rect = chartInnerRef.current.getBoundingClientRect();
      const startDomain = zoomDomain || [minTime, maxTime];
      const startDistance = getTouchDistance(e.touches);
      const midX = getTouchMidX(e.touches) - rect.left;
      const anchorTime = startDomain[0] + (midX / rect.width) * (startDomain[1] - startDomain[0]);
      pinchStateRef.current = { startDistance, startDomain, plotWidth: rect.width, anchorTime };
      panStateRef.current = null;
      setIsZoomTouchActive(true);
      return;
    }
    if (e.touches.length === 1) {
      tapStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, time: Date.now() };
      if (zoomDomain) {
        e.stopPropagation();
        const rect = chartInnerRef.current.getBoundingClientRect();
        panStateRef.current = { startClientX: e.touches[0].clientX, startDomain: zoomDomain, plotWidth: rect.width };
        pinchStateRef.current = null;
        setIsZoomTouchActive(true);
      } else if (fullTimeRange > 1200) {
        // Not zoomed but wide enough to scroll natively — let the scroll
        // happen without it also triggering the outer session-swipe handler.
        e.stopPropagation();
      }
    }
  };

  const handleChartTouchMove = (e) => {
    if (e.touches.length === 2 && pinchStateRef.current) {
      e.preventDefault();
      e.stopPropagation();
      const { startDistance, startDomain, plotWidth, anchorTime } = pinchStateRef.current;
      if (startDistance < 1) return;
      const currentDistance = getTouchDistance(e.touches);
      const scale = currentDistance / startDistance;
      const startWidth = startDomain[1] - startDomain[0];
      const minWidth = Math.min(10, fullTimeRange);
      let newWidth = Math.max(minWidth, Math.min(fullTimeRange, startWidth / scale));
      const rect = chartInnerRef.current.getBoundingClientRect();
      const midX = getTouchMidX(e.touches) - rect.left;
      let newStart = anchorTime - (midX / plotWidth) * newWidth;
      let newEnd = newStart + newWidth;
      if (newStart < minTime) {
        newStart = minTime;
        newEnd = minTime + newWidth;
      }
      if (newEnd > maxTime) {
        newEnd = maxTime;
        newStart = maxTime - newWidth;
      }
      setZoomDomain(newWidth >= fullTimeRange - 0.001 ? null : [newStart, newEnd]);
      return;
    }
    if (e.touches.length === 1 && panStateRef.current) {
      e.preventDefault();
      e.stopPropagation();
      const { startClientX, startDomain, plotWidth } = panStateRef.current;
      const deltaPx = e.touches[0].clientX - startClientX;
      const width = startDomain[1] - startDomain[0];
      const deltaData = (deltaPx / plotWidth) * width;
      let newStart = startDomain[0] - deltaData;
      let newEnd = startDomain[1] - deltaData;
      if (newStart < minTime) {
        newStart = minTime;
        newEnd = minTime + width;
      }
      if (newEnd > maxTime) {
        newEnd = maxTime;
        newStart = maxTime - width;
      }
      setZoomDomain([newStart, newEnd]);
    }
  };

  const handleChartTouchEnd = (e) => {
    if (zoomDomain || fullTimeRange > 1200) {
      e.stopPropagation();
    }
    if (e.touches.length < 2) pinchStateRef.current = null;
    if (e.touches.length === 0) {
      panStateRef.current = null;
      setIsZoomTouchActive(false);

      // Double-tap to reset zoom (only meaningful while zoomed).
      const tapStart = tapStartRef.current;
      tapStartRef.current = null;
      if (zoomDomain && tapStart && e.changedTouches.length === 1) {
        const dx = e.changedTouches[0].clientX - tapStart.x;
        const dy = e.changedTouches[0].clientY - tapStart.y;
        const isTap = Math.hypot(dx, dy) < 10 && Date.now() - tapStart.time < 300;
        if (isTap) {
          const now = Date.now();
          if (now - lastTapRef.current < 350) {
            setZoomDomain(null);
            lastTapRef.current = 0;
          } else {
            lastTapRef.current = now;
          }
        }
      }
    }
  };

  return (
    <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <h2 className="text-lg font-semibold text-white mb-3">Session Detail</h2>
      <div>
        {/* Nav */}
        <div className="flex items-center justify-between mb-1">
          <div>
            <div className="text-white text-sm font-medium">
              {new Date(session.start_time).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })}
              {' '}
              <span className="text-gray-400">
                {new Date(session.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            {session.aircraft_model && (
              <div className="text-sm font-semibold text-white">{session.aircraft_model}</div>
            )}
          </div>
          <div className="flex items-center gap-0">
            <button
              onClick={handlePreviousSession}
              disabled={session.sessionIndex === 0}
              className="p-1 text-white hover:text-blue-400 disabled:text-gray-600 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={22} />
            </button>
            <button
              onClick={handleNextSession}
              disabled={session.sessionIndex === sessions.length - 1}
              className="p-1 text-white hover:text-blue-400 disabled:text-gray-600 disabled:cursor-not-allowed"
            >
              <ChevronRight size={22} />
            </button>
          </div>
        </div>

        {/* Location + Weather */}
        {(session.location || session.weather_temperature_f != null) && (
          <div className="flex items-center gap-3 mb-2 text-xs text-gray-400">
            {session.location && <span>{session.location.name}</span>}
            {session.weather_temperature_f != null && (
              <>
                {session.weather_conditions && <WeatherIcon condition={session.weather_conditions} />}
                <span className="text-gray-300">{convertTemperature(session.weather_temperature_f)}{getTempLabel()}</span>
                {session.weather_wind_speed_mph != null && (
                  <span className="flex items-center gap-1 text-gray-300">
                    <Wind size={12} className="text-gray-400" />
                    {convertWindSpeed(session.weather_wind_speed_mph)} {getWindSpeedLabel()}
                    {session.weather_wind_direction && (
                      <MoveUp
                        size={12}
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

        {/* Chart */}
        <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-3">
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />Thermal start</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />Thermal end</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />Launch peak</span>
          {zoomDomain && <span className="text-gray-500 ml-auto">Pinch to zoom &middot; drag to pan &middot; double-tap to reset</span>}
        </div>
        <div
          className={`mt-1${!zoomDomain && fullTimeRange > 1200 ? ' overflow-x-auto' : ''}`}
          onTouchStart={handleChartTouchStart}
          onTouchMove={handleChartTouchMove}
          onTouchEnd={handleChartTouchEnd}
        >
          <div ref={chartInnerRef} style={!zoomDomain && fullTimeRange > 1200 ? { width: `${(fullTimeRange / 1200) * 100}%` } : {}}>
          <ResponsiveContainer width="100%" height={260} style={{ userSelect: 'none', WebkitUserSelect: 'none' }}>
              <ComposedChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="timestamp"
                  type="number"
                  domain={[displayMinTime, displayMaxTime]}
                  ticks={ticks}
                  tickFormatter={formatTimeAxis}

                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  allowDataOverflow={true}
                  scale="linear"
                  stroke="#6b7280"
                />
                <YAxis

                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  ticks={yTicks}
                  domain={[minYTick, maxYTick]}
                  stroke="#6b7280"
                  width={35}
                />
                {!isZoomTouchActive && (
                  <Tooltip
                    content={<CustomTooltip unitLabel={unitLabel} />}
                    isAnimationActive={false}
                    cursor={{ stroke: '#666', strokeWidth: 1, strokeDasharray: '3 3' }}
                    shared={false}
                    trigger="axis"
                  />
                )}
                <Line
                  type="linear"
                  dataKey="altitude"
                  stroke="#3b82f6"
                  strokeWidth={1.5}
                  dot={renderCustomDot}
                  activeDot={{ r: 3 }}
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

        {/* Stats */}
        <div className="mt-0 mb-4">
          {[
            [['Duration', formatDurationHMS(session.duration_seconds)], ['Launches', session.launch_count]],
            [['Thermals', session.thermal_count], ['Thermal Gain', `${formatAltitudeValue(session.total_thermal_gain).toLocaleString()} ${unitLabel}`]],
            [['Therm Duration', formatDurationHMS(session.total_thermal_duration)], ['Therm %', `${session.duration_seconds > 0 ? ((session.total_thermal_duration / session.duration_seconds) * 100).toFixed(1) : '0.0'}%`]],
          ].map((row, rowIdx, arr) => (
            <div key={rowIdx} className="flex">
              {row.map(([label, value], colIdx) => (
                <div key={colIdx} className={`flex-1 flex justify-between items-center px-3 py-0.5 ${colIdx === 0 ? 'border-r border-gray-700' : ''}`}>
                  <span className="text-xs text-gray-500">{label}</span>
                  <span className="text-xs font-bold text-white">{value}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Thermals */}
        <h3 className="text-sm font-semibold mb-2 text-white">Thermals</h3>
        {session.thermals.length === 0 ? (
          <p className="text-gray-400 text-xs">No thermals detected</p>
        ) : (
          <div className="overflow-y-auto" style={{ maxHeight: '260px' }}>
            <table className="text-xs w-full">
              <thead className="sticky top-0 bg-gray-800">
                <tr className="border-b border-gray-700">
                  <th className="text-right py-1 px-1 font-semibold text-gray-300">#</th>
                  <th className="text-right py-1 px-1 font-semibold text-gray-300">Gain ({unitLabel})</th>
                  <th className="text-right py-1 px-1 font-semibold text-gray-300">Duration</th>
                  <th className="text-right py-1 px-1 font-semibold text-gray-300">Clmb Rt</th>
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
                    <td className="py-1 px-1 font-semibold text-green-400 text-right">
                      {Math.round(formatAltitudeValue(thermal.altitude_gain))}
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
  );
}
