import { useState, useMemo } from 'react';
import { Calendar, Clock, LineChart, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import { formatSessionListDate } from '../utils/dateFormatter';
import { formatAltitudeValue, getUnitLabel } from '../utils/units';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function SessionList({ sessions, onSessionClick, initialSelectedDate = 'all', onSessionDeleted }) {
  
  const handleDelete = async (e, sessionId) => {
    e.stopPropagation(); // Prevent row click
    
    if (!confirm('Are you sure you want to delete this session?')) {
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/api/sessions/${sessionId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        onSessionDeleted && onSessionDeleted();
      } else {
        alert('Failed to delete session');
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Error deleting session');
    }
  };
  const [selectedDate, setSelectedDate] = useState(initialSelectedDate);
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const formatDate = formatSessionListDate;
  const unitLabel = getUnitLabel();

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
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

  const formatDurationHM = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes}m`;
  };

  // Extract unique dates from sessions
  const availableDates = useMemo(() => {
    const dates = sessions.map(session => {
      const date = new Date(session.start_time);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    });
    return ['all', ...new Set(dates)];
  }, [sessions]);

  // Filter and sort sessions by selected date
  const filteredSessions = useMemo(() => {
    let filtered;
    if (selectedDate === 'all') {
      filtered = [...sessions];
    } else {
      filtered = sessions.filter(session => {
        const sessionDate = new Date(session.start_time).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        });
        return sessionDate === selectedDate;
      });
    }

    // Apply column sorting if a column is selected
    if (sortColumn) {
      filtered.sort((a, b) => {
        let aVal, bVal;
        
        switch (sortColumn) {
          case 'session':
            aVal = sessions.indexOf(a);
            bVal = sessions.indexOf(b);
            break;
          case 'date':
            aVal = new Date(a.start_time).getTime();
            bVal = new Date(b.start_time).getTime();
            break;
          case 'duration':
            aVal = a.duration_seconds;
            bVal = b.duration_seconds;
            break;
          case 'launches':
            aVal = a.launch_count;
            bVal = b.launch_count;
            break;
          case 'thermals':
            aVal = a.thermal_count;
            bVal = b.thermal_count;
            break;
          case 'gain':
            aVal = a.total_thermal_gain;
            bVal = b.total_thermal_gain;
            break;
          case 'thermalDuration':
            aVal = a.total_thermal_duration;
            bVal = b.total_thermal_duration;
            break;
          case 'thermalDurationPct':
            aVal = a.duration_seconds > 0 ? (a.total_thermal_duration / a.duration_seconds) : 0;
            bVal = b.duration_seconds > 0 ? (b.total_thermal_duration / b.duration_seconds) : 0;
            break;
          default:
            return 0;
        }
        
        const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    } else if (selectedDate === 'all') {
      // Default sorting: If "All Dates" is selected and no column sort, sort by date (reverse chronological) then by time (chronological within each day)
      filtered.sort((a, b) => {
        const dateA = new Date(a.start_time);
        const dateB = new Date(b.start_time);
        
        // Get date strings without time
        const dayA = new Date(dateA.getFullYear(), dateA.getMonth(), dateA.getDate()).getTime();
        const dayB = new Date(dateB.getFullYear(), dateB.getMonth(), dateB.getDate()).getTime();
        
        // If different days, sort by day (newest first)
        if (dayA !== dayB) {
          return dayB - dayA;
        }
        
        // Same day, sort by time (earliest first)
        return dateA.getTime() - dateB.getTime();
      });
    }

    return filtered;
  }, [sessions, selectedDate, sortColumn, sortDirection]);

  if (sessions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">No sessions yet. Upload a TLM file to get started!</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <select
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="bg-gray-800 text-white border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {availableDates.map(date => (
            <option key={date} value={date}>
              {date === 'all' ? 'All Dates' : date}
            </option>
          ))}
        </select>
      </div>
      
      <div className="bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-700">
        <table className="w-full">
          <thead className="bg-gray-900 border-b border-gray-700">
            <tr>
              <th 
                className="text-left py-2 px-4 text-sm font-semibold text-gray-300 cursor-pointer hover:text-white"
                onClick={() => handleSort('session')}
              >
                <div className="flex items-center gap-1">
                  Session
                  {sortColumn === 'session' && (
                    sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                  )}
                </div>
              </th>
              <th 
                className="text-left py-2 px-4 text-sm font-semibold text-gray-300 cursor-pointer hover:text-white"
                onClick={() => handleSort('date')}
              >
                <div className="flex items-center gap-1">
                  Date
                  {sortColumn === 'date' && (
                    sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                  )}
                </div>
              </th>
              <th 
                className="text-right py-2 px-4 text-sm font-semibold text-gray-300 cursor-pointer hover:text-white"
                onClick={() => handleSort('duration')}
              >
                <div className="flex items-center justify-end gap-1">
                  Duration
                  {sortColumn === 'duration' && (
                    sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                  )}
                </div>
              </th>
              <th 
                className="text-center py-2 px-4 text-sm font-semibold text-gray-300 cursor-pointer hover:text-white"
                onClick={() => handleSort('launches')}
              >
                <div className="flex items-center justify-center gap-1">
                  Launches
                  {sortColumn === 'launches' && (
                    sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                  )}
                </div>
              </th>
              <th 
                className="text-center py-2 px-4 text-sm font-semibold text-gray-300 cursor-pointer hover:text-white"
                onClick={() => handleSort('thermals')}
              >
                <div className="flex items-center justify-center gap-1">
                  Thermals
                  {sortColumn === 'thermals' && (
                    sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                  )}
                </div>
              </th>
              <th 
                className="text-right py-2 px-4 text-sm font-semibold text-gray-300 cursor-pointer hover:text-white"
                onClick={() => handleSort('gain')}
              >
                <div className="flex items-center justify-end gap-1">
                  Thermal Gain
                  {sortColumn === 'gain' && (
                    sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                  )}
                </div>
              </th>
              <th 
                className="text-right py-2 px-4 text-sm font-semibold text-gray-300 cursor-pointer hover:text-white"
                onClick={() => handleSort('thermalDuration')}
              >
                <div className="flex items-center justify-end gap-1">
                  Thermal Duration
                  {sortColumn === 'thermalDuration' && (
                    sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                  )}
                </div>
              </th>
              <th 
                className="text-right py-2 px-4 text-sm font-semibold text-gray-300 cursor-pointer hover:text-white"
                onClick={() => handleSort('thermalDurationPct')}
              >
                <div className="flex items-center justify-end gap-1">
                  Thermal Duration (%)
                  {sortColumn === 'thermalDurationPct' && (
                    sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                  )}
                </div>
              </th>
              <th className="text-center py-2 px-4 text-sm font-semibold text-gray-300">Chart</th>
              <th className="text-center py-2 px-4 text-sm font-semibold text-gray-300">Delete</th>
            </tr>
          </thead>
          <tbody>
            {filteredSessions.map((session, index) => (
              <tr
                key={session.id}
                onClick={() => onSessionClick(session.id, index)}
                className="border-b border-gray-700 hover:bg-gray-700 cursor-pointer transition"
              >
                <td className="py-2 px-4">
                  <span className="font-semibold text-white">{index + 1}</span>
                </td>
                <td className="py-2 px-4 text-white">
                  {formatDate(session.start_time)}
                </td>
                <td className="py-2 px-4 text-white text-right">
                  {formatDuration(session.duration_seconds)}
                </td>
                <td className="py-2 px-4 text-center text-white">
                  {session.launch_count}
                </td>
                <td className="py-2 px-4 text-center text-white">
                  {session.thermal_count}
                </td>
                <td className="py-2 px-4 text-right text-white">
                  {formatAltitudeValue(session.total_thermal_gain).toLocaleString()} {unitLabel}
                </td>
                <td className="py-2 px-4 text-right text-white">
                  {formatDuration(session.total_thermal_duration)}
                </td>
                <td className="py-2 px-4 text-right text-white">
                  {session.duration_seconds > 0 
                    ? ((session.total_thermal_duration / session.duration_seconds) * 100).toFixed(1)
                    : '0.0'}%
                </td>
                <td className="py-2 px-4 text-center">
                  <LineChart size={18} className="text-blue-400 inline" />
                </td>
                <td className="py-2 px-4 text-center">
                  <button
                    onClick={(e) => handleDelete(e, session.id)}
                    className="text-red-400 hover:text-red-300 transition"
                    title="Delete session"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
