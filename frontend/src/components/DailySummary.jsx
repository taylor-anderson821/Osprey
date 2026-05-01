import { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { MoveUp, ChevronUp, ChevronDown } from 'lucide-react';
import { formatAltitudeValue, getUnitLabel, convertTemperature, getTempLabel, convertWindSpeed, getWindSpeedLabel } from '../utils/units';
import { WeatherIcon } from '../utils/weatherIcon';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function DailySummary({ onDateClick }) {
  const [dailyData, setDailyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortCol, setSortCol] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [hoveredDate, setHoveredDate] = useState(null);
  const unitLabel = getUnitLabel();
  const tempLabel = getTempLabel();
  const windLabel = getWindSpeedLabel();

  const windDirectionDegrees = {
    'N': 0, 'NNE': 22.5, 'NE': 45, 'ENE': 67.5,
    'E': 90, 'ESE': 112.5, 'SE': 135, 'SSE': 157.5,
    'S': 180, 'SSW': 202.5, 'SW': 225, 'WSW': 247.5,
    'W': 270, 'WNW': 292.5, 'NW': 315, 'NNW': 337.5,
  };

  useEffect(() => {
    fetchDailySummary();
  }, []);

  const fetchDailySummary = async () => {
    try {
      const response = await fetch(`${API_URL}/api/daily-summary`);
      const data = await response.json();
      setDailyData(data);
    } catch (error) {
      console.error('Error fetching daily summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDuration = (seconds) => {
    if (seconds < 60) {
      return `${Math.floor(seconds)}s`;
    }
    const minutes = Math.floor(seconds / 60);
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes}m`;
  };

  const chartData = [...dailyData].reverse().map(day => ({
    date: formatDate(day.date),
    launches: day.launch_count,
    thermals: day.thermal_count,
    gain: Math.round(formatAltitudeValue(day.total_thermal_gain))
  }));

  // Calculate nice round tick marks for Y-axis
  const maxGain = Math.max(...chartData.map(d => d.gain), 0);
  const getYAxisTicks = () => {
    if (maxGain === 0) return [0];
    
    // Determine a nice interval
    const magnitude = Math.pow(10, Math.floor(Math.log10(maxGain)));
    let interval = magnitude;
    
    if (maxGain / interval > 10) interval = magnitude * 2;
    if (maxGain / interval > 10) interval = magnitude * 5;
    if (maxGain / interval > 10) interval = magnitude * 10;
    
    const ticks = [];
    for (let i = 0; i <= Math.ceil(maxGain / interval); i++) {
      ticks.push(i * interval);
    }
    return ticks;
  };
  
  const yAxisTicks = getYAxisTicks();

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const sortedData = useMemo(() => {
    return [...dailyData].sort((a, b) => {
      let aVal, bVal;
      switch (sortCol) {
        case 'date':          aVal = new Date(a.date); bVal = new Date(b.date); break;
        case 'duration':      aVal = a.session_duration; bVal = b.session_duration; break;
        case 'launches':      aVal = a.launch_count; bVal = b.launch_count; break;
        case 'thermals':      aVal = a.thermal_count; bVal = b.thermal_count; break;
        case 'gain':          aVal = a.total_thermal_gain; bVal = b.total_thermal_gain; break;
        case 'thermDuration': aVal = a.total_thermal_duration; bVal = b.total_thermal_duration; break;
        case 'thermPct':      aVal = a.session_duration > 0 ? a.total_thermal_duration / a.session_duration : 0;
                              bVal = b.session_duration > 0 ? b.total_thermal_duration / b.session_duration : 0; break;
        case 'temp':          aVal = a.weather_temperature_f ?? -999; bVal = b.weather_temperature_f ?? -999; break;
        case 'wind':          aVal = a.weather_wind_speed_mph ?? -1; bVal = b.weather_wind_speed_mph ?? -1; break;
        default: return 0;
      }
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [dailyData, sortCol, sortDir]);

  const SortTh = ({ col, align = 'right', className = '', children }) => (
    <th
      className={`py-2 px-2 text-sm font-semibold text-gray-300 cursor-pointer hover:text-white text-${align} ${className}`}
      onClick={() => handleSort(col)}
    >
      <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : ''}`}>
        {children}
        {sortCol === col && (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
      </div>
    </th>
  );

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (dailyData.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">No flight data yet</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Daily Statistics Table - Left 1/2 */}
      <div className="lg:col-span-1">
        <div className="bg-gray-800 rounded-lg shadow-md p-4 border border-gray-700 h-full flex flex-col">
          <h3 className="text-base font-semibold mb-3 text-white">Daily Log</h3>
          <div className="overflow-auto flex-1" style={{ maxHeight: '400px' }}>
            <table className="w-full text-sm">
              <thead className="bg-gray-900 border-b border-gray-700 sticky top-0">
                <tr>
                  <SortTh col="date" align="left">Date</SortTh>
                  <SortTh col="duration">Flight Duration</SortTh>
                  <SortTh col="launches">Lchs</SortTh>
                  <SortTh col="thermals">Thrms</SortTh>
                  <SortTh col="gain">Therm Gain ({unitLabel})</SortTh>
                  <SortTh col="thermDuration">Therm Duration</SortTh>
                  <SortTh col="thermPct">Therm Duration (%)</SortTh>
                  <SortTh col="wx" align="center" className="pl-4 w-6">Wx</SortTh>
                  <SortTh col="temp" className="pl-3 w-12">Temp</SortTh>
                  <SortTh col="wind" className="pl-3">Wind</SortTh>
                  <th className="text-center py-2 px-1 text-sm font-semibold text-gray-300 pl-3 w-6">Dir</th>
                </tr>
              </thead>
              <tbody>
                {sortedData.map((day, index) => {
                  const thermalPercentage = day.session_duration > 0 
                    ? ((day.total_thermal_duration / day.session_duration) * 100).toFixed(1)
                    : '0.0';
                  
                  const fullDate = new Date(day.date).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                  });
                  
                  return (
                    <tr 
                      key={index} 
                      className={`border-b border-gray-700 cursor-pointer transition ${formatDate(day.date) === hoveredDate ? 'bg-blue-900' : 'hover:bg-gray-700'}`}
                      onClick={() => onDateClick && onDateClick(fullDate)}
                    >
                      <td className="py-2 px-2 text-gray-300 whitespace-nowrap">{formatDate(day.date)}</td>
                      <td className="py-2 px-2 text-gray-300 text-right whitespace-nowrap">{formatDuration(day.session_duration)}</td>
                      <td className="py-2 px-2 text-gray-300 text-right">{day.launch_count}</td>
                      <td className="py-2 px-2 text-gray-300 text-right">{day.thermal_count}</td>
                      <td className="py-2 px-2 text-gray-300 text-right whitespace-nowrap">{Math.round(formatAltitudeValue(day.total_thermal_gain)).toLocaleString()}</td>
                      <td className="py-2 px-2 text-gray-300 text-right whitespace-nowrap">{formatDuration(day.total_thermal_duration)}</td>
                      <td className="py-2 px-2 text-gray-300 text-right">{thermalPercentage}%</td>
                      <td className="py-2 px-1 text-center pl-4 w-6">
                        <WeatherIcon condition={day.weather_conditions} />
                      </td>
                      <td className="py-2 px-1 text-gray-300 text-right whitespace-nowrap pl-3 w-12">
                        {day.weather_temperature_f != null ? `${convertTemperature(day.weather_temperature_f)}${tempLabel}` : '—'}
                      </td>
                      <td className="py-2 px-1 text-gray-300 text-right whitespace-nowrap pl-3">
                        {day.weather_wind_speed_mph != null ? `${convertWindSpeed(day.weather_wind_speed_mph)} ${windLabel}` : '—'}
                      </td>
                      <td className="py-2 px-1 text-center pl-3 w-6">
                        {day.weather_wind_direction != null
                          ? <MoveUp
                              size={16}
                              className="inline text-blue-300"
                              style={{ transform: `rotate(${(windDirectionDegrees[day.weather_wind_direction] ?? 0) + 180}deg)` }}
                              title={day.weather_wind_direction}
                            />
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Bar Charts - Right 1/2 */}
      <div className="lg:col-span-1 flex flex-col gap-4">
        {/* Thermal Gain Chart */}
        <div className="bg-gray-800 rounded-lg shadow-md p-4 border border-gray-700 flex-1">
          <h3 className="text-base font-semibold mb-2 text-white">Thermal Gain</h3>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={chartData} margin={{ left: 40 }}
              onMouseMove={(e) => e.activeLabel && setHoveredDate(e.activeLabel)}
              onMouseLeave={() => setHoveredDate(null)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
              <XAxis dataKey="date" stroke="#9ca3af" />
              <YAxis 
                stroke="#9ca3af" 
                label={{ 
                  value: `Thermal Gain (${unitLabel})`, 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle' },
                  offset: -20
                }}
                tickFormatter={(value) => value.toLocaleString()}
                ticks={yAxisTicks}
                domain={[0, 'auto']}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', color: '#fff' }}
                formatter={(value) => value.toLocaleString()}
              />
              <Legend />
              <Bar dataKey="gain" fill="#ef4444" name={`Thermal Gain (${unitLabel})`} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Thermal Duration % Chart */}
        <div className="bg-gray-800 rounded-lg shadow-md p-4 border border-gray-700 flex-1">
          <h3 className="text-base font-semibold mb-2 text-white">Thermal Duration %</h3>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={chartData.map(d => ({
              ...d,
              percentage: dailyData.find(day => formatDate(day.date) === d.date)?.session_duration > 0
                ? ((dailyData.find(day => formatDate(day.date) === d.date)?.total_thermal_duration / 
                    dailyData.find(day => formatDate(day.date) === d.date)?.session_duration) * 100).toFixed(1)
                : 0
            }))} margin={{ left: 40 }}
              onMouseMove={(e) => e.activeLabel && setHoveredDate(e.activeLabel)}
              onMouseLeave={() => setHoveredDate(null)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
              <XAxis dataKey="date" stroke="#9ca3af" />
              <YAxis 
                stroke="#9ca3af" 
                label={{ 
                  value: 'Thermal Duration (%)', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle' },
                  offset: -20
                }}
                domain={[0, 50]}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', color: '#fff' }}
                formatter={(value) => `${value}%`}
              />
              <Legend />
              <Bar dataKey="percentage" fill="#3b82f6" name="Thermal Duration %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
