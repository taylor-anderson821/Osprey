import { useState, useEffect } from 'react';
import { User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../utils/api';

export default function ProfileMobile() {
  const cached = (() => {
    try { return JSON.parse(localStorage.getItem('profile_cache') || 'null'); } catch { return null; }
  })();

  const [profile, setProfile] = useState(cached?.profile || null);
  const [stats, setStats] = useState(cached?.stats || null);
  const [loading, setLoading] = useState(!cached);
  const [units, setUnits] = useState('imperial');
  const navigate = useNavigate();

  useEffect(() => {
    const savedUnits = localStorage.getItem('units') || 'imperial';
    setUnits(savedUnits);
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [profileRes, statsRes] = await Promise.all([
        apiFetch('/api/profile'),
        apiFetch('/api/profile-stats'),
      ]);
      const [profileData, statsData] = await Promise.all([
        profileRes.json(),
        statsRes.json(),
      ]);
      setProfile(profileData);
      setStats(statsData);
      localStorage.setItem('profile_cache', JSON.stringify({ profile: profileData, stats: statsData }));
    } catch (error) {
      console.error('Error fetching profile data:', error);
    } finally {
      setLoading(false);
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

  const flyingDays = stats?.flying_days ?? 0;
  const totalFlightTime = stats?.total_flight_time ?? 0;
  const totalThermalGain = stats?.total_thermal_gain ?? 0;
  const totalThermalDuration = stats?.total_thermal_duration ?? 0;
  const aircraftModels = stats?.aircraft_models ?? [];

  const maxFlightTimeSession = stats?.max_flight_time_session;
  const maxThermalGainSession = stats?.max_thermal_gain_session;
  const maxThermalDurationSession = stats?.max_thermal_duration_session;
  const maxThermalDurationThermal = stats?.max_thermal_duration;
  const maxThermalGainThermal = stats?.max_thermal_gain;
  const maxClimbRateThermal = stats?.max_avg_climb_rate;

  const maxFlightTime = maxFlightTimeSession?.value ?? 0;
  const maxThermalGain = maxThermalGainSession?.value ?? 0;
  const maxThermalDuration = maxThermalDurationSession?.value ?? 0;
  const maxSingleThermalDuration = maxThermalDurationThermal?.value ?? 0;
  const maxSingleThermalGain = maxThermalGainThermal?.value ?? 0;
  const maxAvgClimbRate = maxClimbRateThermal?.value ?? 0;

  if (loading) return <div className="text-center py-12">Loading...</div>;

  return (
    <div className="max-w-sm mx-auto flex flex-col gap-6">
      <div className="flex items-center gap-3">
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
        <div className="flex flex-col min-w-0">
          <h2 className="text-xl font-bold text-white">
            {profile?.first_name && profile?.last_name
              ? `${profile.first_name} ${profile.last_name}`
              : profile?.email || 'User Profile'}
          </h2>
          {profile?.home_location && (
            <p className="text-sm text-gray-400">{profile.home_location.name}</p>
          )}
          {aircraftModels.length > 0 && (
            <p className="text-sm text-gray-400">{aircraftModels.join(', ')}</p>
          )}
        </div>
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

      {stats?.max_flight_time_session && (
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

      {stats?.max_thermal_duration && (
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
