import { useState, useEffect } from 'react';
import { User, TrendingUp, Clock, Plane } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [units, setUnits] = useState('imperial');

  useEffect(() => {
    fetchProfile();
    fetchSessions();
    // Load units from localStorage
    const savedUnits = localStorage.getItem('units') || 'imperial';
    setUnits(savedUnits);
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch(`${API_URL}/api/profile`);
      const data = await response.json();
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchSessions = async () => {
    try {
      const response = await fetch(`${API_URL}/api/sessions`);
      const data = await response.json();
      setSessions(data);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds) => {
    // Round to nearest second first
    const totalSeconds = Math.round(seconds);
    
    if (totalSeconds < 60) {
      return `${totalSeconds}s`;
    }
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    return `${minutes}m ${secs}s`;
  };

  const formatTotalDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}d ${remainingHours}h`;
    }
    
    return `${hours}h ${minutes}m`;
  };

  const formatThermalGain = (gain) => {
    if (units === 'imperial') {
      // 1 mile = 5280 feet
      if (gain >= 5280) {
        const miles = gain / 5280;
        return `${miles.toFixed(1)} mi`;
      }
      return `${Math.round(gain).toLocaleString()} ft`;
    } else {
      // Metric: assume gain is in meters
      if (gain >= 1000) {
        const km = gain / 1000;
        return `${km.toFixed(1)} km`;
      }
      return `${Math.round(gain).toLocaleString()} m`;
    }
  };

  // Calculate totals
  const totalSessions = sessions.length;
  const totalThermalGain = sessions.reduce((sum, s) => sum + s.total_thermal_gain, 0);
  const totalThermalDuration = sessions.reduce((sum, s) => sum + s.total_thermal_duration, 0);
  const totalFlightTime = sessions.reduce((sum, s) => sum + s.duration_seconds, 0);

  // Calculate maximums
  const maxFlightTime = sessions.length > 0 ? Math.max(...sessions.map(s => s.duration_seconds)) : 0;
  const maxThermalGain = sessions.length > 0 ? Math.max(...sessions.map(s => s.total_thermal_gain)) : 0;
  const maxThermalDuration = sessions.length > 0 ? Math.max(...sessions.map(s => s.total_thermal_duration)) : 0;

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Profile Header - Left Column */}
        <div className="lg:col-span-1">
          <div className="bg-gray-800 rounded-lg shadow-md p-6 border border-gray-700 h-full">
            <div className="flex flex-col items-center">
              {profile?.photo_url ? (
                <img
                  src={profile.photo_url}
                  alt="Profile"
                  className="w-32 h-32 rounded-full object-cover border-4 border-gray-600 mb-4"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gray-700 flex items-center justify-center border-4 border-gray-600 mb-4">
                  <User size={64} className="text-gray-400" />
                </div>
              )}
              
              <h2 className="text-2xl font-bold text-white mb-3 text-center">
                {profile?.first_name && profile?.last_name
                  ? `${profile.first_name} ${profile.last_name}`
                  : profile?.email || 'User Profile'}
              </h2>
              
              <div className="space-y-2 text-gray-300 w-full">
                <p className="text-sm">
                  <span className="text-gray-400">Email:</span> {profile?.email}
                </p>
                {profile?.home_location && (
                  <p className="text-sm">
                    <span className="text-gray-400">Home Location:</span> {profile.home_location.name}
                  </p>
                )}
                <p className="text-sm text-gray-400">
                  Member since {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Soaring Log - Right Columns */}
        <div className="lg:col-span-3">
          <div className="bg-gray-800 rounded-lg shadow-md p-6 border border-gray-700 h-full">
            <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <TrendingUp size={28} />
              Soaring Log
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Sessions */}
              <div className="bg-gray-750 rounded-lg p-4 border border-gray-600">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-medium text-gray-400">Total Sessions</h4>
                  <Plane size={18} className="text-blue-400" />
                </div>
                <p className="text-2xl font-bold text-white">{totalSessions}</p>
              </div>

              {/* Total Flight Duration */}
              <div className="bg-gray-750 rounded-lg p-4 border border-gray-600">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-medium text-gray-400">Total Flight Duration</h4>
                  <Clock size={18} className="text-green-400" />
                </div>
                <p className="text-2xl font-bold text-white">{formatTotalDuration(totalFlightTime)}</p>
              </div>

              {/* Total Thermal Gain */}
              <div className="bg-gray-750 rounded-lg p-4 border border-gray-600">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-medium text-gray-400">Total Thermal Gain</h4>
                  <TrendingUp size={18} className="text-purple-400" />
                </div>
                <p className="text-2xl font-bold text-white">
                  {formatThermalGain(totalThermalGain)}
                </p>
              </div>

              {/* Total Thermal Duration */}
              <div className="bg-gray-750 rounded-lg p-4 border border-gray-600">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-medium text-gray-400">Total Thermal Duration</h4>
                  <Clock size={18} className="text-orange-400" />
                </div>
                <p className="text-2xl font-bold text-white">{formatTotalDuration(totalThermalDuration)}</p>
              </div>
            </div>

            {/* Session Records */}
            {totalSessions > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-700">
                <h4 className="text-lg font-semibold text-white mb-3">Session Records</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-750 rounded-lg p-4 border border-gray-600">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-medium text-gray-400">Max Flight Time</h4>
                      <Clock size={18} className="text-green-400" />
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {formatDuration(maxFlightTime)}
                    </p>
                  </div>
                  <div className="bg-gray-750 rounded-lg p-4 border border-gray-600">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-medium text-gray-400">Max Thermal Gain</h4>
                      <TrendingUp size={18} className="text-purple-400" />
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {formatThermalGain(maxThermalGain)}
                    </p>
                  </div>
                  <div className="bg-gray-750 rounded-lg p-4 border border-gray-600">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-medium text-gray-400">Max Thermal Duration</h4>
                      <Clock size={18} className="text-orange-400" />
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {formatDuration(maxThermalDuration)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
