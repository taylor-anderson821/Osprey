import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ArrowRight } from 'lucide-react';
import { formatAltitudeValue, getUnitLabel } from '../utils/units';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function DailySummary({ onDateClick }) {
  const [dailyData, setDailyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const unitLabel = getUnitLabel();

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
                  <th className="text-left py-2 px-2 text-sm font-semibold text-gray-300">Date</th>
                  <th className="text-right py-2 px-2 text-sm font-semibold text-gray-300">Sessions</th>
                  <th className="text-right py-2 px-2 text-sm font-semibold text-gray-300">Flight Duration</th>
                  <th className="text-right py-2 px-2 text-sm font-semibold text-gray-300">Launches</th>
                  <th className="text-right py-2 px-2 text-sm font-semibold text-gray-300">Therms</th>
                  <th className="text-right py-2 px-2 text-sm font-semibold text-gray-300">Therm Gain ({unitLabel})</th>
                  <th className="text-right py-2 px-2 text-sm font-semibold text-gray-300">Therm Duration</th>
                  <th className="text-right py-2 px-2 text-sm font-semibold text-gray-300">Therm Duration (%)</th>
                  <th className="text-center py-2 px-2 text-sm font-semibold text-gray-300">View</th>
                </tr>
              </thead>
              <tbody>
                {dailyData.map((day, index) => {
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
                      className="border-b border-gray-700 hover:bg-gray-700 cursor-pointer transition"
                      onClick={() => onDateClick && onDateClick(fullDate)}
                    >
                      <td className="py-2 px-2 text-gray-300 whitespace-nowrap">{formatDate(day.date)}</td>
                      <td className="py-2 px-2 text-gray-300 text-right">{day.session_count}</td>
                      <td className="py-2 px-2 text-gray-300 text-right whitespace-nowrap">{formatDuration(day.session_duration)}</td>
                      <td className="py-2 px-2 text-gray-300 text-right">{day.launch_count}</td>
                      <td className="py-2 px-2 text-gray-300 text-right">{day.thermal_count}</td>
                      <td className="py-2 px-2 text-gray-300 text-right whitespace-nowrap">{Math.round(formatAltitudeValue(day.total_thermal_gain)).toLocaleString()}</td>
                      <td className="py-2 px-2 text-gray-300 text-right whitespace-nowrap">{formatDuration(day.total_thermal_duration)}</td>
                      <td className="py-2 px-2 text-gray-300 text-right">{thermalPercentage}%</td>
                      <td className="py-2 px-2 text-center">
                        <ArrowRight size={16} className="text-blue-400 inline" />
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
            <BarChart data={chartData} margin={{ left: 40 }}>
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
            }))} margin={{ left: 40 }}>
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
