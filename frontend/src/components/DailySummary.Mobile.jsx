import { useState, useEffect, useMemo, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MoveUp, ChevronUp, ChevronDown } from 'lucide-react';
import { formatAltitudeValue, getUnitLabel, convertTemperature, getTempLabel, convertWindSpeed, getWindSpeedLabel } from '../utils/units';
import { WeatherIcon } from '../utils/weatherIcon';
import { apiFetch } from '../utils/api';

export default function DailySummaryMobile({ onDateClick }) {
  const [dailyData, setDailyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortCol, setSortCol] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [hoveredDate, setHoveredDate] = useState(null);
  const [activePanel, setActivePanel] = useState(0);
  const carouselRef = useRef(null);

  const unitLabel = getUnitLabel();

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
        default: return 0;
      }
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [dailyData, sortCol, sortDir]);

  const SortTh = ({ col, align = 'right', children }) => (
    <th
      className={`py-1 px-1 font-semibold text-gray-300 cursor-pointer hover:text-white text-${align}`}
      onClick={() => handleSort(col)}
    >
      <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''}`}>
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

  const GainChartPanel = () => (
    <div className="h-full flex flex-col py-2">
      <h3 className="text-sm font-medium text-white mb-2">Thermal Gain ({unitLabel})</h3>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}
            onMouseMove={(e) => e.activeLabel && setHoveredDate(e.activeLabel)}
            onMouseLeave={() => setHoveredDate(null)}>
            <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
            <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 11 }} />
            <YAxis stroke="#9ca3af" width={50} tickFormatter={(v) => v.toLocaleString()} ticks={yAxisTicks} domain={[0, 'auto']} tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', color: '#fff' }} formatter={(v) => v.toLocaleString()} />
            <Bar dataKey="gain" fill="#ef4444" name={`Thermal Gain (${unitLabel})`} cursor="pointer" onClick={(data) => onDateClick && onDateClick(data.date)} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const DurationChartPanel = () => (
    <div className="h-full flex flex-col py-2">
      <h3 className="text-sm font-medium text-white mb-2">Thermal Duration (%)</h3>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}
            onMouseMove={(e) => e.activeLabel && setHoveredDate(e.activeLabel)}
            onMouseLeave={() => setHoveredDate(null)}>
            <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
            <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 11 }} />
            <YAxis stroke="#9ca3af" width={35} domain={[0, 50]} tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', color: '#fff' }} formatter={(v) => `${v}%`} />
            <Bar dataKey="percentage" fill="#3b82f6" name="Thermal Duration %" cursor="pointer" onClick={(data) => onDateClick && onDateClick(data.date)} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const panelLabels = ['Thermal Gain', 'Thermal Duration %'];

  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-3">Daily Summary</h2>

      <div
        ref={carouselRef}
        onScroll={handleCarouselScroll}
        className="flex overflow-x-auto snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {[<GainChartPanel key="gain" />, <DurationChartPanel key="duration" />].map((panel, i) => (
          <div key={i} className="w-full flex-shrink-0 snap-start" style={{ height: '280px' }}>
            {panel}
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center mt-3 gap-1 mb-4">
        <div className="flex gap-2">
          {[0, 1].map(i => (
            <button
              key={i}
              onClick={() => scrollToPanel(i)}
              className={`rounded-full transition-all ${activePanel === i ? 'w-4 h-2 bg-blue-400' : 'w-2 h-2 bg-gray-500'}`}
            />
          ))}
        </div>
        <span className="text-xs text-gray-500">{panelLabels[activePanel]}</span>
      </div>

      <h3 className="text-sm font-medium text-white mb-2">Daily Log</h3>
      <div className="overflow-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-900 border-b border-gray-700 sticky top-0">
            <tr>
              <SortTh col="date" align="left">Date</SortTh>
              <SortTh col="duration">Duration</SortTh>
              <SortTh col="launches">Lchs</SortTh>
              <SortTh col="thermals">Thrms</SortTh>
              <SortTh col="gain">Gain ({unitLabel})</SortTh>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((day, index) => {
              const fullDate = new Date(day.date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
              return (
                <tr
                  key={index}
                  className={`border-b border-gray-700 cursor-pointer transition ${formatDate(day.date) === hoveredDate ? 'bg-blue-900' : 'hover:bg-gray-700'}`}
                  onClick={() => onDateClick && onDateClick(fullDate)}
                >
                  <td className="py-1 px-1 text-gray-300 whitespace-nowrap">{formatDate(day.date)}</td>
                  <td className="py-1 px-1 text-gray-300 text-right whitespace-nowrap">{formatDuration(day.session_duration)}</td>
                  <td className="py-1 px-1 text-gray-300 text-right">{day.launch_count}</td>
                  <td className="py-1 px-1 text-gray-300 text-right">{day.thermal_count}</td>
                  <td className="py-1 px-1 text-green-400 text-right whitespace-nowrap">{Math.round(formatAltitudeValue(day.total_thermal_gain)).toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
