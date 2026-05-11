import { useMemo } from 'react';
import { formatDateShort } from '../utils/dateFormatter';
import { formatAltitudeValue, getUnitLabel } from '../utils/units';

export default function SessionListMobile({ sessions, onSessionClick }) {
  const unitLabel = getUnitLabel();

  const formatDuration = (seconds) => {
    if (seconds < 60) return `${Math.floor(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  const sortedSessions = useMemo(() =>
    [...sessions].sort((a, b) => new Date(b.start_time) - new Date(a.start_time)),
    [sessions]
  );

  if (sessions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">No sessions yet. Upload a TLM file to get started!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-white">Sessions</h2>
      {sortedSessions.map((session) => (
        <div
          key={session.id}
          onClick={() => onSessionClick(session.id)}
          className="bg-gray-800 border border-gray-700 rounded-lg p-4 cursor-pointer hover:bg-gray-700 transition"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-white font-medium">{formatDateShort(session.start_time)}</span>
            <span className="text-gray-400 text-sm">{formatDuration(session.duration_seconds)}</span>
          </div>
          <div className="flex gap-4 text-sm">
            <span className="text-gray-400">{session.launch_count} launches</span>
            <span className="text-gray-400">{session.thermal_count} thermals</span>
            <span className="text-green-400 font-medium">
              {formatAltitudeValue(session.total_thermal_gain).toLocaleString()} {unitLabel}
            </span>
          </div>
          {session.location && (
            <div className="text-xs text-gray-500 mt-1">{session.location.name}</div>
          )}
        </div>
      ))}
    </div>
  );
}
