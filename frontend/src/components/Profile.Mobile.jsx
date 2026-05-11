import { useState, useEffect } from 'react';
import { User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../utils/api';

export default function ProfileMobile() {
  const [profile, setProfile] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [dailySummary, setDailySummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [units, setUnits] = useState('imperial');
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile();
    fetchSessions();
    fetchDailySummary();
    const savedUnits = localStorage.getItem('units') || 'imperial';
    setUnits(savedUnits);
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await apiFetch('/api/profile');
      const data = await response.json();
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchSessions = async () => {
    try {
      const response = await apiFetch('/api/sessions-with-thermals');
      const data = await response.json();
      setSessions(data);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDailySummary = async () => {
    try {
      const response = await apiFetch('/api/daily-summary');
      const data = await response.json();
      setDailySummary(data);
    } catch (error) {
      console.error('Error fetching daily summary:', error);
    }
  };

  const formatDuration = (seconds) => {
    const totalSeconds = Math.round(seconds);
    if (totalSeconds < 60) return `${totalSeconds}s`;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    return `${minutes}m ${secs}s`;
  };

  const formatTotalDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h ${minutes}m`;
  };

  const formatThermalGain = (gainInFeet) => {
    if (units === 'imperial') {
      if (gainInFeet >= 5280) return `${(gainInFeet / 5280).toFixed(1)} mi`;
      return `${Math.round(gainInFeet).toLocaleString()} ft`;
    } else {
      const gainInMeters = gainInFeet * 0.3048;
      if (gainInMeters >= 1000) return `${(gainInMeters / 1000).toFixed(1)} km`;
      return `${Math.round(gainInMeters).toLocaleString()} m`;
    }
  };

  const formatClimbRate = (rateInFeetPerSecond) => {
    if (units === 'imperial') return `${rateInFeetPerSecond.toFixed(1)} ft/s`;
    return `${(rateInFeetPerSecond * 0.3048).toFixed(1)} m/s`;
  };

  const flyingDays = dailySummary.length;
  const totalThermalGain = sessions.reduce((sum, s) => sum + s.total_thermal_gain, 0);
  const totalThermalDuration = sessions.reduce((sum, s) => sum + s.total_thermal_duration, 0);
  const totalFlightTime = sessions.reduce((sum, s) => sum + s.duration_seconds, 0);

  const maxFlightTime = sessions.length > 0 ? Math.max(...sessions.map(s => s.duration_seconds)) : 0;
  const maxThermalGain = sessions.length > 0 ? Math.max(...sessions.map(s => s.total_thermal_gain)) : 0;
  const maxThermalDuration = sessions.length > 0 ? Math.max(...sessions.map(s => s.total_thermal_duration)) : 0;

  const maxFlightTimeSession = sessions.find(s => s.duration_seconds === maxFlightTime);
  const maxThermalGainSession = sessions.find(s => s.total_thermal_gain === maxThermalGain);
  const maxThermalDurationSession = sessions.find(s => s.total_thermal_duration === maxThermalDuration);

  const allThermals = sessions.flatMap(session =>
    session.thermals ? session.thermals.map(thermal => ({
      ...thermal,
      session_id: session.id,
      avg_climb_rate: thermal.duration > 0 ? thermal.altitude_gain / thermal.duration : 0,
    })) : []
  );

  const maxSingleThermalDuration = allThermals.length > 0 ? Math.max(...allThermals.map(t => t.duration)) : 0;
  const maxSingleThermalGain = allThermals.length > 0 ? Math.max(...allThermals.map(t => t.altitude_gain)) : 0;
  const maxAvgClimbRate = allThermals.length > 0 ? Math.max(...allThermals.map(t => t.avg_climb_rate)) : 0;

  const maxThermalDurationThermal = allThermals.find(t => t.duration === maxSingleThermalDuration);
  const maxThermalGainThermal = allThermals.find(t => t.altitude_gain === maxSingleThermalGain);
  const maxClimbRateThermal = allThermals.find(t => t.avg_climb_rate === maxAvgClimbRate);

  const aircraftModels = [...new Set(sessions.map(s => s.aircraft_model).filter(Boolean))].sort();

  if (loading) return <div className="text-center py-12">Loading...</div>;

  return (
    <div className="max-w-sm mx-auto flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          {profile?.photo_url ? (
            <img
              src={profile.photo_url}
              alt="Profile"
              className="w-16 h-16 rounded-full object-cover border-2 border-gray-600 flex-shrink-0"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center border-2 border-gray-600 flex-shrink-0">
              <User size={32} className="text-gray-400" />
            </div>
          )}
          <h2 className="text-xl font-bold text-white">
            {profile?.first_name && profile?.last_name
              ? `${profile.first_name} ${profile.last_name}`
              : profile?.email || 'User Profile'}
          </h2>
        </div>
        {profile?.home_location && (
          <p className="text-sm text-gray-400">{profile.home_location.name}</p>
        )}
        {aircraftModels.length > 0 && (
          <p className="text-sm text-gray-400">{aircraftModels.join(', ')}</p>
        )}
      </div>

      <div>
        <h3 className="text-sm font-medium text-teal-400 mb-3">Soaring History</h3>
        <table className="text-xs w-full">
          <tbody>
            <tr className="border-b border-gray-700">
              <td className="py-1 px-1 text-gray-300">Flying Days</td>
              <td className="py-1 px-1 text-white text-right font-semibold">{flyingDays}</td>
            </tr>
            <tr className="border-b border-gray-700">
              <td className="py-1 px-1 text-gray-300">Flight Duration</td>
              <td className="py-1 px-1 text-white text-right font-semibold">{formatTotalDuration(totalFlightTime)}</td>
            </tr>
            <tr className="border-b border-gray-700">
              <td className="py-1 px-1 text-gray-300">Thermal Gain</td>
              <td className="py-1 px-1 text-green-400 text-right font-semibold">{formatThermalGain(totalThermalGain)}</td>
            </tr>
            <tr className="border-b border-gray-700">
              <td className="py-1 px-1 text-gray-300">Thermal Duration</td>
              <td className="py-1 px-1 text-white text-right font-semibold">{formatTotalDuration(totalThermalDuration)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {sessions.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-teal-400 mb-3">Session Records</h3>
          <table className="text-xs w-full">
            <tbody>
              <tr className="border-b border-gray-700 cursor-pointer hover:bg-gray-700" onClick={() => maxFlightTimeSession && navigate(`/sessions/${maxFlightTimeSession.id}`)}>
                <td className="py-1 px-1 text-gray-300">Flight Time</td>
                <td className="py-1 px-1 text-white text-right font-semibold">{formatDuration(maxFlightTime)}</td>
              </tr>
              <tr className="border-b border-gray-700 cursor-pointer hover:bg-gray-700" onClick={() => maxThermalGainSession && navigate(`/sessions/${maxThermalGainSession.id}`)}>
                <td className="py-1 px-1 text-gray-300">Thermal Gain</td>
                <td className="py-1 px-1 text-green-400 text-right font-semibold">{formatThermalGain(maxThermalGain)}</td>
              </tr>
              <tr className="border-b border-gray-700 cursor-pointer hover:bg-gray-700" onClick={() => maxThermalDurationSession && navigate(`/sessions/${maxThermalDurationSession.id}`)}>
                <td className="py-1 px-1 text-gray-300">Thermal Duration</td>
                <td className="py-1 px-1 text-white text-right font-semibold">{formatDuration(maxThermalDuration)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {allThermals.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-teal-400 mb-3">Thermal Records</h3>
          <table className="text-xs w-full">
            <tbody>
              <tr className="border-b border-gray-700 cursor-pointer hover:bg-gray-700" onClick={() => maxThermalDurationThermal && navigate(`/sessions/${maxThermalDurationThermal.session_id}`)}>
                <td className="py-1 px-1 text-gray-300">Thermal Duration</td>
                <td className="py-1 px-1 text-white text-right font-semibold">{formatDuration(maxSingleThermalDuration)}</td>
              </tr>
              <tr className="border-b border-gray-700 cursor-pointer hover:bg-gray-700" onClick={() => maxThermalGainThermal && navigate(`/sessions/${maxThermalGainThermal.session_id}`)}>
                <td className="py-1 px-1 text-gray-300">Thermal Gain</td>
                <td className="py-1 px-1 text-green-400 text-right font-semibold">{formatThermalGain(maxSingleThermalGain)}</td>
              </tr>
              <tr className="border-b border-gray-700 cursor-pointer hover:bg-gray-700" onClick={() => maxClimbRateThermal && navigate(`/sessions/${maxClimbRateThermal.session_id}`)}>
                <td className="py-1 px-1 text-gray-300">Avg Climb Rate</td>
                <td className="py-1 px-1 text-white text-right font-semibold">{formatClimbRate(maxAvgClimbRate)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
