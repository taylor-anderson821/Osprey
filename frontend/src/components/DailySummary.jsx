import { useState, useEffect, useMemo, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { MoveUp, ChevronUp, ChevronDown } from 'lucide-react';
import { formatAltitudeValue, getUnitLabel, convertTemperature, getTempLabel, convertWindSpeed, getWindSpeedLabel } from '../utils/units';
import { WeatherIcon } from '../utils/weatherIcon';
import { apiFetch } from '../utils/api';

export default function DailySummary({ onDateClick }) {
  const [dailyData, setDailyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortCol, setSortCol] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [hoveredDate, setHoveredDate] = useState(null);
  const [activePanel, setActivePanel] = useState(0);
  const carouselRef = useRef(null);

  const unitLabel = getUnitLabel();
  const tempLabel = getTempLabel();
  const windLabel = getWindSpeedLabel();

  const windDirectionDegrees = {
    'N': 0, 'NNE': 22.5, 'NE': 45, 'ENE': 67.5,
    'E': 90, 'ESE': 112.5, 'SE': 135, 'SSE': 157.5,
    'S': 180, 'SSW': 202.5, 'SW': 225, 'WSW': 247.5,
    'W': 270, 'WNW': 292.5, 'NW': 315, 'NNW': 337.5,
  };

  useEffect(() => { fetchDailySummary(); }, []);

  const fetchDailySummary = async () => {
    try {
      const response = await apiFetch('/api/daily-summary');
      const data = await response.json();
      setDailyData(data);
    } catch (error) {
      console.error('Error fetching daily summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-US', {
    month: '2-digit', day: '2-digit', year: '2-digit'
  });

  const formatDuration = (seconds) => {
    if (seconds < 60) return `${Math.floor(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  const chartData = [...dailyData].reverse().map(day => ({
    date: formatDate(day.date),
    gain: Math.round(formatAltitudeValue(day.total_thermal_gain)),
    percentage: day.session_duration > 0
      ? parseFloat(((day.total_thermal_duration / day.session_duration) * 100).toFixed(1))
      : 0,
  }));

  const maxGain = Math.max(...chartData.map(d => d.gain), 0);
  const getYAxisTicks = () => {
    if (maxGain === 0) return [0];
    const magnitude = Math.pow(10, Math.floor(Math.log10(maxGain)));
    let interval = magnitude;
    if (maxGain / interval > 10) interval = magnitude * 2;
    if (maxGain / interval > 10) interval = magnitude * 5;
    if (maxGain / interval > 10) interval = magnitude * 10;
    const ticks = [];
    for (let i = 0; i <= Math.ceil(maxGain / interval); i++) ticks.push(i * interval);
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

  const handleCarouselScroll = () => {
    if (!carouselRef.current) return;
    const { scrollLeft, clientWidth } = carouselRef.current;
    setActivePanel(Math.round(scrollLeft / clientWidth));
  };

  const scrollToPanel = (index) => {
    if (!carouselRef.current) return;
    carouselRef.current.scrollTo({ left: index * carouselRef.current.clientWidth, behavior: 'smooth' });
  };

  if (loading) return <div className="text-center py-12">Loading...</div>;
  if (dailyData.length === 0) {
    return <div className="text-center py-12"><p className="text-gray-500 text-lg">No flight data yet</p></div>;
  }

  const TablePanel = () => (
    <div className="bg-gray-800 rounded-lg shadow-md p-4 border border-gray-700 flex flex-col h-full">
      <h3 className="text-base font-semibold mb-3 text-white">Daily Log</h3>
      <div className="overflow-auto flex-1">
        <table className="w-full text-sm">
          <thead className="bg-gray-900 border-b border-gray-700 sticky top-0">
            <tr>
              <SortTh col="date" align="left">Date</SortTh>
              <SortTh col="duration">Duration</SortTh>
              <SortTh col="launches">Lchs</SortTh>
              <SortTh col="thermals">Thrms</SortTh>
              <SortTh col="gain">Gain ({unitLabel})</SortTh>
              <SortTh col="thermDuration" className="hidden md:table-cell">Therm Duration</SortTh>
              <SortTh col="thermPct" className="hidden md:table-cell">Therm %</SortTh>
              <SortTh col="wx" align="center" className="hidden md:table-cell pl-4 w-6">Wx</SortTh>
              <SortTh col="temp" className="hidden md:table-cell pl-3 w-12">Temp</SortTh>
              <SortTh col="wind" className="hidden md:table-cell pl-3">Wind</SortTh>
              <th className="hidden md:table-cell text-center py-2 px-1 text-sm font-semibold text-gray-300 pl-3 w-6">Dir</th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((day, index) => {
              const thermalPercentage = day.session_duration > 0
                ? ((day.total_thermal_duration / day.session_duration) * 100).toFixed(1)
                : '0.0';
              const fullDate = new Date(day.date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
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
                  <td className="hidden md:table-cell py-2 px-2 text-gray-300 text-right whitespace-nowrap">{formatDuration(day.total_thermal_duration)}</td>
                  <td className="hidden md:table-cell py-2 px-2 text-gray-300 text-right">{thermalPercentage}%</td>
                  <td className="hidden md:table-cell py-2 px-1 text-center pl-4 w-6"><WeatherIcon condition={day.weather_conditions} /></td>
                  <td className="hidden md:table-cell py-2 px-1 text-gray-300 text-right whitespace-nowrap pl-3 w-12">
                    {day.weather_temperature_f != null ? `${convertTemperature(day.weather_temperature_f)}${tempLabel}` : '—'}
                  </td>
                  <td className="hidden md:table-cell py-2 px-1 text-gray-300 text-right whitespace-nowrap pl-3">
                    {day.weather_wind_speed_mph != null ? `${convertWindSpeed(day.weather_wind_speed_mph)} ${windLabel}` : '—'}
                  </td>
                  <td className="hidden md:table-cell py-2 px-1 text-center pl-3 w-6">
                    {day.weather_wind_direction != null
                      ? <MoveUp size={16} className="inline text-blue-300"
                          style={{ transform: `rotate(${(windDirectionDegrees[day.weather_wind_direction] ?? 0) + 180}deg)` }}
                          title={day.weather_wind_direction} />
                      : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  const GainChartPanel = () => (
    <div className="bg-gray-800 rounded-lg shadow-md p-4 border border-gray-700 h-full flex flex-col">
      <h3 className="text-base font-semibold mb-2 text-white">Thermal Gain ({unitLabel})</h3>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}
            onMouseMove={(e) => e.activeLabel && setHoveredDate(e.activeLabel)}
            onMouseLeave={() => setHoveredDate(null)}>
            <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
            <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 11 }} />
            <YAxis stroke="#9ca3af" width={50}
              tickFormatter={(v) => v.toLocaleString()} ticks={yAxisTicks} domain={[0, 'auto']} tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', color: '#fff' }}
              formatter={(v) => v.toLocaleString()} />
            <Bar dataKey="gain" fill="#ef4444" name={`Thermal Gain (${unitLabel})`} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const DurationChartPanel = () => (
    <div className="bg-gray-800 rounded-lg shadow-md p-4 border border-gray-700 h-full flex flex-col">
      <h3 className="text-base font-semibold mb-2 text-white">Thermal Duration (%)</h3>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}
            onMouseMove={(e) => e.activeLabel && setHoveredDate(e.activeLabel)}
            onMouseLeave={() => setHoveredDate(null)}>
            <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
            <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 11 }} />
            <YAxis stroke="#9ca3af" width={35} domain={[0, 50]} tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', color: '#fff' }}
              formatter={(v) => `${v}%`} />
            <Bar dataKey="percentage" fill="#3b82f6" name="Thermal Duration %" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const panelLabels = ['Thermal Gain', 'Thermal Duration %', 'Daily Log'];

  return (
    <>
      {/* Mobile: swipeable carousel */}
      <div className="lg:hidden">
        <div
          ref={carouselRef}
          onScroll={handleCarouselScroll}
          className="flex overflow-x-auto snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {[<GainChartPanel key="gain" />, <DurationChartPanel key="duration" />, <TablePanel key="table" />].map((panel, i) => (
            <div key={i} className="w-full flex-shrink-0 snap-start" style={{ height: '360px' }}>
              {panel}
            </div>
          ))}
        </div>

        {/* Dot indicators + label */}
        <div className="flex flex-col items-center mt-3 gap-1">
          <div className="flex gap-2">
            {[0, 1, 2].map(i => (
              <button
                key={i}
                onClick={() => scrollToPanel(i)}
                className={`rounded-full transition-all ${activePanel === i ? 'w-4 h-2 bg-blue-400' : 'w-2 h-2 bg-gray-500'}`}
              />
            ))}
          </div>
          <span className="text-xs text-gray-500">{panelLabels[activePanel]}</span>
        </div>
      </div>

      {/* Desktop: side-by-side grid */}
      <div className="hidden lg:grid grid-cols-2 gap-6">
        <div className="flex flex-col">
          <TablePanel />
        </div>
        <div className="flex flex-col gap-4">
          <div style={{ height: '300px' }}><GainChartPanel /></div>
          <div style={{ height: '300px' }}><DurationChartPanel /></div>
        </div>
      </div>
    </>
  );
}
