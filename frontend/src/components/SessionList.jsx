import { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Trash2, MapPin, MoveUp } from 'lucide-react';
import { formatDateShort } from '../utils/dateFormatter';
import { formatAltitudeValue, getUnitLabel, convertTemperature, getTempLabel, convertWindSpeed, getWindSpeedLabel } from '../utils/units';
import LocationEditModal from './LocationEditModal';
import { WeatherIcon } from '../utils/weatherIcon';
import { apiFetch } from '../utils/api';

export default function SessionList({ sessions, onSessionClick, initialSelectedDate = 'all', onSessionDeleted, page = 0, pageSize, totalCount, onPageChange }) {
  const [editingSession, setEditingSession] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectedDate, setSelectedDate] = useState(initialSelectedDate);
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const unitLabel = getUnitLabel();
  const tempLabel = getTempLabel();
  const windLabel = getWindSpeedLabel();

  const windDirectionDegrees = {
    'N': 0, 'NNE': 22.5, 'NE': 45, 'ENE': 67.5,
    'E': 90, 'ESE': 112.5, 'SE': 135, 'SSE': 157.5,
    'S': 180, 'SSW': 202.5, 'SW': 225, 'WSW': 247.5,
    'W': 270, 'WNW': 292.5, 'NW': 315, 'NNW': 337.5,
  };

  const formatDuration = (seconds) => {
    if (seconds < 60) return `${Math.floor(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const toggleSelect = (e, id) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.size} session(s)?`)) return;
    try {
      const response = await apiFetch('/api/sessions/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_ids: [...selectedIds] }),
      });
      if (response.ok) {
        setSelectedIds(new Set());
        onSessionDeleted && onSessionDeleted();
      } else {
        alert('Failed to delete sessions');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting sessions');
    }
  };

  const handleBulkLocation = () => {
    // Open location modal with first selected session; apply to all selected
    const first = sessions.find(s => selectedIds.has(s.id));
    if (first) setEditingSession({ ...first, bulkIds: [...selectedIds] });
  };

  const handleDelete = async (e, sessionId) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this session?')) return;
    try {
      const response = await apiFetch(`/api/sessions/${sessionId}`, { method: 'DELETE' });
      if (response.ok) {
        onSessionDeleted && onSessionDeleted();
      } else {
        alert('Failed to delete session');
      }
    } catch (error) {
      console.error(error);
      alert('Error deleting session');
    }
  };

  const availableDates = useMemo(() => {
    const dates = sessions.map(s =>
      new Date(s.start_time).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })
    );
    return ['all', ...new Set(dates)];
  }, [sessions]);

  const sessionDayNumbers = useMemo(() => {
    const byDate = {};
    sessions.forEach(s => {
      const date = new Date(s.start_time).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
      if (!byDate[date]) byDate[date] = [];
      byDate[date].push(s);
    });
    const numbers = {};
    Object.values(byDate).forEach(daySessions => {
      daySessions.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
      daySessions.forEach((s, i) => { numbers[s.id] = `S${i + 1}`; });
    });
    return numbers;
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    const effectiveDate = availableDates.includes(selectedDate) ? selectedDate : 'all';
    let filtered = effectiveDate === 'all'
      ? [...sessions]
      : sessions.filter(s =>
          new Date(s.start_time).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }) === effectiveDate
        );

    if (sortColumn) {
      filtered.sort((a, b) => {
        let aVal, bVal;
        switch (sortColumn) {
          case 'session':       aVal = sessions.indexOf(a); bVal = sessions.indexOf(b); break;
          case 'date':          aVal = new Date(a.start_time).getTime(); bVal = new Date(b.start_time).getTime(); break;
          case 'location':      aVal = a.location?.name ?? ''; bVal = b.location?.name ?? ''; break;
          case 'duration':      aVal = a.duration_seconds; bVal = b.duration_seconds; break;
          case 'launches':      aVal = a.launch_count; bVal = b.launch_count; break;
          case 'thermals':      aVal = a.thermal_count; bVal = b.thermal_count; break;
          case 'gain':          aVal = a.total_thermal_gain; bVal = b.total_thermal_gain; break;
          case 'windSpeed':     aVal = a.weather_wind_speed_mph ?? -1; bVal = b.weather_wind_speed_mph ?? -1; break;
          case 'temp':          aVal = a.weather_temperature_f ?? -1; bVal = b.weather_temperature_f ?? -1; break;
          case 'thermalDuration': aVal = a.total_thermal_duration; bVal = b.total_thermal_duration; break;
          case 'thermalDurationPct':
            aVal = a.duration_seconds > 0 ? a.total_thermal_duration / a.duration_seconds : 0;
            bVal = b.duration_seconds > 0 ? b.total_thermal_duration / b.duration_seconds : 0;
            break;
          default: return 0;
        }
        const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sortDirection === 'asc' ? cmp : -cmp;
      });
    } else {
      filtered.sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
    }
    return filtered;
  }, [sessions, availableDates, selectedDate, sortColumn, sortDirection]);

  const SortTh = ({ col, align = 'left', width = '', className = '', children }) => (
    <th
      className={`text-${align} py-1.5 px-2 text-sm font-semibold text-gray-300 cursor-pointer hover:text-white ${width} ${className}`}
      onClick={() => handleSort(col)}
    >
      <div className={`flex items-center ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : ''} gap-1`}>
        {children}
        {sortColumn === col && (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
      </div>
    </th>
  );

  if (sessions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">No sessions yet. Upload a TLM file to get started!</p>
      </div>
    );
  }

  const hasSelection = selectedIds.size > 0;
  const hasPagination = pageSize && totalCount > pageSize;
  const rangeStart = hasPagination ? page * pageSize + 1 : 0;
  const rangeEnd = hasPagination ? Math.min((page + 1) * pageSize, totalCount) : 0;
  const canGoPrev = hasPagination && page > 0;
  const canGoNext = hasPagination && rangeEnd < totalCount;

  const allSelected = filteredSessions.length > 0 && filteredSessions.every(s => selectedIds.has(s.id));
  const someSelected = !allSelected && filteredSessions.some(s => selectedIds.has(s.id));

  const selectAllRef = useRef(null);
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  const toggleSelectAll = (e) => {
    e.stopPropagation();
    if (allSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        filteredSessions.forEach(s => next.delete(s.id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        filteredSessions.forEach(s => next.add(s.id));
        return next;
      });
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <select
          value={availableDates.includes(selectedDate) ? selectedDate : 'all'}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="bg-gray-800 text-white border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {availableDates.map(date => (
            <option key={date} value={date}>{date === 'all' ? 'All Dates' : date}</option>
          ))}
        </select>

        {hasPagination && (
          <div className="flex items-center gap-2 text-sm text-gray-400 ml-auto">
            <span>{rangeStart}–{rangeEnd} of {totalCount}</span>
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={!canGoPrev}
              className="p-1 rounded hover:bg-gray-700 disabled:opacity-30 disabled:hover:bg-transparent transition"
              title="Previous 100"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={!canGoNext}
              className="p-1 rounded hover:bg-gray-700 disabled:opacity-30 disabled:hover:bg-transparent transition"
              title="Next 100"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}

        {hasSelection && (
          <>
            <span className="text-sm text-gray-400">{selectedIds.size} selected</span>
            <button
              onClick={handleBulkLocation}
              className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition text-sm"
              title="Set location for selected"
            >
              <MapPin size={16} /> Location
            </button>
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1 text-red-400 hover:text-red-300 transition text-sm"
              title="Delete selected"
            >
              <Trash2 size={16} /> Delete
            </button>
          </>
        )}
      </div>

      <div className="overflow-x-auto w-full">
      <div className="bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-700 inline-block min-w-full">
        <table className="text-sm">
          <thead className="bg-gray-900 border-b border-gray-700">
            <tr>
              <th className="py-1.5 px-2 w-6" onClick={(e) => e.stopPropagation()}>
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="accent-blue-500 cursor-pointer"
                  title={allSelected ? 'Deselect all' : 'Select all'}
                />
              </th>
              <SortTh col="date">Date</SortTh>
              <SortTh col="duration" align="right">Duration</SortTh>
              <SortTh col="launches" align="center">Launches</SortTh>
              <SortTh col="thermals" align="center">Thermals</SortTh>
              <SortTh col="gain" align="right" width="w-16">Thermal Gain</SortTh>
              <SortTh col="thermalDuration" align="right" width="w-16" className="hidden md:table-cell">Thermal Duration</SortTh>
              <SortTh col="thermalDurationPct" align="right" width="w-16" className="hidden md:table-cell">Thermal Duration (%)</SortTh>
              <th className="hidden md:table-cell text-center py-1.5 pl-6 pr-2 text-sm font-semibold text-gray-300">Wx</th>
              <SortTh col="temp" align="right" width="pl-6" className="hidden md:table-cell">Temp</SortTh>
              <SortTh col="windSpeed" align="right" width="pl-6" className="hidden md:table-cell">Wind</SortTh>
              <th className="hidden md:table-cell text-center py-1.5 pl-6 pr-2 text-sm font-semibold text-gray-300">Dir</th>
              <SortTh col="location" className="hidden sm:table-cell">Location</SortTh>
            </tr>
          </thead>
          <tbody>
            {filteredSessions.map((session, index) => (
              <tr
                key={session.id}
                onClick={() => onSessionClick(session.id, index)}
                className={`border-b border-gray-700 hover:bg-gray-700 cursor-pointer transition ${selectedIds.has(session.id) ? 'bg-gray-750 ring-1 ring-inset ring-blue-500' : ''}`}
              >
                <td className="py-1.5 px-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(session.id)}
                    onChange={(e) => toggleSelect(e, session.id)}
                    className="accent-blue-500 cursor-pointer"
                  />
                </td>
                <td className="py-1.5 px-2 text-white whitespace-nowrap">
                  {formatDateShort(session.start_time)} <span className="text-gray-400">{sessionDayNumbers[session.id]}</span>
                </td>
                <td className="py-1.5 px-2 text-white text-right whitespace-nowrap">{formatDuration(session.duration_seconds)}</td>
                <td className="py-1.5 px-2 text-center text-white">{session.launch_count}</td>
                <td className="py-1.5 px-2 text-center text-white">{session.thermal_count}</td>
                <td className="py-1.5 px-2 text-right text-white whitespace-nowrap">
                  {formatAltitudeValue(session.total_thermal_gain).toLocaleString()} {unitLabel}
                </td>
                <td className="hidden md:table-cell py-1.5 px-2 text-right text-white whitespace-nowrap">{formatDuration(session.total_thermal_duration)}</td>
                <td className="hidden md:table-cell py-1.5 px-2 text-right text-white">
                  {session.duration_seconds > 0
                    ? ((session.total_thermal_duration / session.duration_seconds) * 100).toFixed(1)
                    : '0.0'}%
                </td>
                <td className="hidden md:table-cell py-1.5 pl-6 pr-2 text-center">
                  <WeatherIcon condition={session.weather_conditions} />
                </td>
                <td className="hidden md:table-cell py-1.5 pl-6 pr-2 text-right text-white whitespace-nowrap">
                  {session.weather_temperature_f != null ? `${convertTemperature(session.weather_temperature_f)}${tempLabel}` : '—'}
                </td>
                <td className="hidden md:table-cell py-1.5 pl-6 pr-2 text-right text-white whitespace-nowrap">
                  {session.weather_wind_speed_mph != null ? `${convertWindSpeed(session.weather_wind_speed_mph)} ${windLabel}` : '—'}
                </td>
                <td className="hidden md:table-cell py-1.5 pl-6 pr-2 text-center text-white">
                  {session.weather_wind_direction != null
                    ? <MoveUp
                        size={18}
                        className="inline text-blue-300"
                        style={{ transform: `rotate(${(windDirectionDegrees[session.weather_wind_direction] ?? 0) + 180}deg)` }}
                        title={session.weather_wind_direction}
                      />
                    : '—'}
                </td>
                <td className="hidden sm:table-cell py-1.5 px-2 text-white whitespace-nowrap">{session.location?.name ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>

      {editingSession && (
        <LocationEditModal
          session={editingSession}
          onClose={() => setEditingSession(null)}
          onUpdate={() => {
            setEditingSession(null);
            setSelectedIds(new Set());
            onSessionDeleted && onSessionDeleted();
          }}
        />
      )}
    </div>
  );
}
