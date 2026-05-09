import { useState, useEffect, useRef } from 'react';
import { User, TrendingUp, Clock, Plane } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../utils/api';

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [dailySummary, setDailySummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [units, setUnits] = useState('imperial');
  const [activePanel, setActivePanel] = useState(0);
  const carouselRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile();
    fetchSessions();
    fetchDailySummary();
    // Load units from localStorage
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

  const formatThermalGain = (gainInFeet) => {
    if (units === 'imperial') {
      // 1 mile = 5280 feet
      if (gainInFeet >= 5280) {
        const miles = gainInFeet / 5280;
        return `${miles.toFixed(1)} mi`;
      }
      return `${Math.round(gainInFeet).toLocaleString()} ft`;
    } else {
      // Metric: convert feet to meters first
      const gainInMeters = gainInFeet * 0.3048;
      
      // Only show km if >= 1000m
      if (gainInMeters >= 1000) {
        const km = gainInMeters / 1000;
        return `${km.toFixed(1)} km`;
      }
      return `${Math.round(gainInMeters).toLocaleString()} m`;
    }
  };

  const formatClimbRate = (rateInFeetPerSecond) => {
    if (units === 'imperial') {
      return `${rateInFeetPerSecond.toFixed(1)} ft/s`;
    } else {
      // Convert feet per second to meters per second
      const rateInMetersPerSecond = rateInFeetPerSecond * 0.3048;
      return `${rateInMetersPerSecond.toFixed(1)} m/s`;
    }
  };

  // Calculate totals
  const flyingDays = dailySummary.length;
  const totalThermalGain = sessions.reduce((sum, s) => sum + s.total_thermal_gain, 0);
  const totalThermalDuration = sessions.reduce((sum, s) => sum + s.total_thermal_duration, 0);
  const totalFlightTime = sessions.reduce((sum, s) => sum + s.duration_seconds, 0);

  // Calculate maximums and track which session holds each record
  const maxFlightTime = sessions.length > 0 ? Math.max(...sessions.map(s => s.duration_seconds)) : 0;
  const maxThermalGain = sessions.length > 0 ? Math.max(...sessions.map(s => s.total_thermal_gain)) : 0;
  const maxThermalDuration = sessions.length > 0 ? Math.max(...sessions.map(s => s.total_thermal_duration)) : 0;

  const maxFlightTimeSession = sessions.find(s => s.duration_seconds === maxFlightTime);
  const maxThermalGainSession = sessions.find(s => s.total_thermal_gain === maxThermalGain);
  const maxThermalDurationSession = sessions.find(s => s.total_thermal_duration === maxThermalDuration);

  // Calculate thermal records from individual thermals
  const allThermals = sessions.flatMap(session => 
    session.thermals ? session.thermals.map(thermal => ({
      ...thermal,
      session_id: session.id,
      avg_climb_rate: thermal.duration > 0 ? thermal.altitude_gain / thermal.duration : 0
    })) : []
  );

  const maxSingleThermalDuration = allThermals.length > 0 ? Math.max(...allThermals.map(t => t.duration)) : 0;
  const maxSingleThermalGain = allThermals.length > 0 ? Math.max(...allThermals.map(t => t.altitude_gain)) : 0;
  const maxAvgClimbRate = allThermals.length > 0 ? Math.max(...allThermals.map(t => t.avg_climb_rate)) : 0;

  const maxThermalDurationThermal = allThermals.find(t => t.duration === maxSingleThermalDuration);
  const maxThermalGainThermal = allThermals.find(t => t.altitude_gain === maxSingleThermalGain);
  const maxClimbRateThermal = allThermals.find(t => t.avg_climb_rate === maxAvgClimbRate);

  const handleCarouselScroll = () => {
    if (!carouselRef.current) return;
    const { scrollLeft, clientWidth } = carouselRef.current;
    setActivePanel(Math.round(scrollLeft / clientWidth));
  };

  const scrollToPanel = (index) => {
    if (!carouselRef.current) return;
    carouselRef.current.scrollTo({ left: index * carouselRef.current.clientWidth, behavior: 'smooth' });
  };

  const panelLabels = ['Soaring History', 'Session Records', 'Thermal Records'];

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  const ProfileHeader = () => (
    <div className="bg-gray-800 rounded-lg shadow-md p-6 border border-gray-700 h-full">
      <div className="flex flex-col items-center">
        {profile?.photo_url ? (
          <img
            src={profile.photo_url}
            alt="Profile"
            className="w-32 h-32 rounded-full object-cover border-4 border-gray-600 mb-4"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        ) : (
          <div className="w-32 h-32 rounded-full bg-gray-700 flex items-center justify-center border-4 border-gray-600 mb-4">
            <User size={64} className="text-gray-400" />
          </div>
        )}
        <h2 className="text-xl lg:text-2xl font-bold text-white mb-3 text-center">
          {profile?.first_name && profile?.last_name
            ? `${profile.first_name} ${profile.last_name}`
            : profile?.email || 'User Profile'}
        </h2>
        <div className="space-y-2 text-gray-300 w-full">
          <p className="text-sm"><span className="text-gray-400">Email:</span> {profile?.email}</p>
          {profile?.home_location && (
            <p className="text-sm"><span className="text-gray-400">Home Location:</span> {profile.home_location.name}</p>
          )}
          <p className="text-sm text-gray-400">
            Member since {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }) : 'N/A'}
          </p>
        </div>
      </div>
    </div>
  );

  const SoaringHistoryPanel = () => (
    <div className="bg-gray-800 rounded-lg shadow-md p-6 border border-gray-700 h-full">
      <h3 className="text-base font-semibold text-white mb-4">Soaring History</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-750 rounded-lg p-4 border border-gray-600">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-medium text-gray-400">Flying Days</h4>
            <Plane size={18} className="text-blue-400" />
          </div>
          <p className="text-lg font-bold text-white">{flyingDays}</p>
        </div>
        <div className="bg-gray-750 rounded-lg p-4 border border-gray-600">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-medium text-gray-400">Flight Duration</h4>
            <Clock size={18} className="text-green-400" />
          </div>
          <p className="text-lg font-bold text-white">{formatTotalDuration(totalFlightTime)}</p>
        </div>
        <div className="bg-gray-750 rounded-lg p-4 border border-gray-600">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-medium text-gray-400">Thermal Gain</h4>
            <TrendingUp size={18} className="text-purple-400" />
          </div>
          <p className="text-lg font-bold text-white">{formatThermalGain(totalThermalGain)}</p>
        </div>
        <div className="bg-gray-750 rounded-lg p-4 border border-gray-600">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-medium text-gray-400">Thermal Duration</h4>
            <Clock size={18} className="text-orange-400" />
          </div>
          <p className="text-lg font-bold text-white">{formatTotalDuration(totalThermalDuration)}</p>
        </div>
      </div>
    </div>
  );

  const SessionRecordsPanel = () => (
    <div className="bg-gray-800 rounded-lg shadow-md p-6 border border-gray-700 h-full">
      <h3 className="text-base font-semibold text-white mb-4">Session Records</h3>
      {sessions.length === 0 ? (
        <p className="text-gray-500">No sessions yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          <div
            className="bg-gray-750 rounded-lg p-4 border border-gray-600 cursor-pointer hover:border-blue-500 hover:bg-gray-700 transition"
            onClick={() => maxFlightTimeSession && navigate(`/sessions/${maxFlightTimeSession.id}`)}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-medium text-gray-400">Flight Time</h4>
              <Clock size={18} className="text-green-400" />
            </div>
            <p className="text-lg font-bold text-white">{formatDuration(maxFlightTime)}</p>
          </div>
          <div
            className="bg-gray-750 rounded-lg p-4 border border-gray-600 cursor-pointer hover:border-blue-500 hover:bg-gray-700 transition"
            onClick={() => maxThermalGainSession && navigate(`/sessions/${maxThermalGainSession.id}`)}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-medium text-gray-400">Thermal Gain</h4>
              <TrendingUp size={18} className="text-purple-400" />
            </div>
            <p className="text-lg font-bold text-white">{formatThermalGain(maxThermalGain)}</p>
          </div>
          <div
            className="bg-gray-750 rounded-lg p-4 border border-gray-600 cursor-pointer hover:border-blue-500 hover:bg-gray-700 transition"
            onClick={() => maxThermalDurationSession && navigate(`/sessions/${maxThermalDurationSession.id}`)}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-medium text-gray-400">Thermal Duration</h4>
              <Clock size={18} className="text-orange-400" />
            </div>
            <p className="text-lg font-bold text-white">{formatDuration(maxThermalDuration)}</p>
          </div>
        </div>
      )}
    </div>
  );

  const ThermalRecordsPanel = () => (
    <div className="bg-gray-800 rounded-lg shadow-md p-6 border border-gray-700 h-full">
      <h3 className="text-base font-semibold text-white mb-4">Thermal Records</h3>
      {allThermals.length === 0 ? (
        <p className="text-gray-500">No thermal data yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          <div
            className="bg-gray-750 rounded-lg p-4 border border-gray-600 cursor-pointer hover:border-blue-500 hover:bg-gray-700 transition"
            onClick={() => maxThermalDurationThermal && navigate(`/sessions/${maxThermalDurationThermal.session_id}`)}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-medium text-gray-400">Thermal Duration</h4>
              <Clock size={18} className="text-orange-400" />
            </div>
            <p className="text-lg font-bold text-white">{formatDuration(maxSingleThermalDuration)}</p>
          </div>
          <div
            className="bg-gray-750 rounded-lg p-4 border border-gray-600 cursor-pointer hover:border-blue-500 hover:bg-gray-700 transition"
            onClick={() => maxThermalGainThermal && navigate(`/sessions/${maxThermalGainThermal.session_id}`)}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-medium text-gray-400">Thermal Gain</h4>
              <TrendingUp size={18} className="text-purple-400" />
            </div>
            <p className="text-lg font-bold text-white">{formatThermalGain(maxSingleThermalGain)}</p>
          </div>
          <div
            className="bg-gray-750 rounded-lg p-4 border border-gray-600 cursor-pointer hover:border-blue-500 hover:bg-gray-700 transition"
            onClick={() => maxClimbRateThermal && navigate(`/sessions/${maxClimbRateThermal.session_id}`)}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-medium text-gray-400">Avg Climb Rate</h4>
              <TrendingUp size={18} className="text-blue-400" />
            </div>
            <p className="text-lg font-bold text-white">{formatClimbRate(maxAvgClimbRate)}</p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div>
      {/* Mobile: profile header + swipeable carousel */}
      <div className="lg:hidden">
        <ProfileHeader />
        <div className="mt-4">
          <div
            ref={carouselRef}
            onScroll={handleCarouselScroll}
            className="flex overflow-x-auto snap-x snap-mandatory"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {[<SoaringHistoryPanel key="history" />, <SessionRecordsPanel key="session" />, <ThermalRecordsPanel key="thermal" />].map((panel, i) => (
              <div key={i} className="w-full flex-shrink-0 snap-start">
                {panel}
              </div>
            ))}
          </div>
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
      </div>

      {/* Desktop: original side-by-side layout */}
      <div className="hidden lg:grid grid-cols-4 gap-6">
        <div className="col-span-1">
          <ProfileHeader />
        </div>
        <div className="col-span-3">
          <div className="bg-gray-800 rounded-lg shadow-md p-6 border border-gray-700 h-full">
            <h3 className="text-xl font-semibold text-white mb-4">Soaring History</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gray-750 rounded-lg p-4 border border-gray-600">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-medium text-gray-400">Flying Days</h4>
                  <Plane size={18} className="text-blue-400" />
                </div>
                <p className="text-2xl font-bold text-white">{flyingDays}</p>
              </div>
              <div className="bg-gray-750 rounded-lg p-4 border border-gray-600">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-medium text-gray-400">Flight Duration</h4>
                  <Clock size={18} className="text-green-400" />
                </div>
                <p className="text-2xl font-bold text-white">{formatTotalDuration(totalFlightTime)}</p>
              </div>
              <div className="bg-gray-750 rounded-lg p-4 border border-gray-600">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-medium text-gray-400">Thermal Gain</h4>
                  <TrendingUp size={18} className="text-purple-400" />
                </div>
                <p className="text-2xl font-bold text-white">{formatThermalGain(totalThermalGain)}</p>
              </div>
              <div className="bg-gray-750 rounded-lg p-4 border border-gray-600">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-medium text-gray-400">Thermal Duration</h4>
                  <Clock size={18} className="text-orange-400" />
                </div>
                <p className="text-2xl font-bold text-white">{formatTotalDuration(totalThermalDuration)}</p>
              </div>
            </div>
            {sessions.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-700">
                <h4 className="text-xl font-semibold text-white mb-3">Session Records</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div
                    className="bg-gray-750 rounded-lg p-4 border border-gray-600 cursor-pointer hover:border-blue-500 hover:bg-gray-700 transition"
                    onClick={() => maxFlightTimeSession && navigate(`/sessions/${maxFlightTimeSession.id}`)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-medium text-gray-400">Flight Time</h4>
                      <Clock size={18} className="text-green-400" />
                    </div>
                    <p className="text-2xl font-bold text-white">{formatDuration(maxFlightTime)}</p>
                  </div>
                  <div
                    className="bg-gray-750 rounded-lg p-4 border border-gray-600 cursor-pointer hover:border-blue-500 hover:bg-gray-700 transition"
                    onClick={() => maxThermalGainSession && navigate(`/sessions/${maxThermalGainSession.id}`)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-medium text-gray-400">Thermal Gain</h4>
                      <TrendingUp size={18} className="text-purple-400" />
                    </div>
                    <p className="text-2xl font-bold text-white">{formatThermalGain(maxThermalGain)}</p>
                  </div>
                  <div
                    className="bg-gray-750 rounded-lg p-4 border border-gray-600 cursor-pointer hover:border-blue-500 hover:bg-gray-700 transition"
                    onClick={() => maxThermalDurationSession && navigate(`/sessions/${maxThermalDurationSession.id}`)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-medium text-gray-400">Thermal Duration</h4>
                      <Clock size={18} className="text-orange-400" />
                    </div>
                    <p className="text-2xl font-bold text-white">{formatDuration(maxThermalDuration)}</p>
                  </div>
                </div>
              </div>
            )}
            {allThermals.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-700">
                <h4 className="text-xl font-semibold text-white mb-3">Thermal Records</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div
                    className="bg-gray-750 rounded-lg p-4 border border-gray-600 cursor-pointer hover:border-blue-500 hover:bg-gray-700 transition"
                    onClick={() => maxThermalDurationThermal && navigate(`/sessions/${maxThermalDurationThermal.session_id}`)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-medium text-gray-400">Thermal Duration</h4>
                      <Clock size={18} className="text-orange-400" />
                    </div>
                    <p className="text-2xl font-bold text-white">{formatDuration(maxSingleThermalDuration)}</p>
                  </div>
                  <div
                    className="bg-gray-750 rounded-lg p-4 border border-gray-600 cursor-pointer hover:border-blue-500 hover:bg-gray-700 transition"
                    onClick={() => maxThermalGainThermal && navigate(`/sessions/${maxThermalGainThermal.session_id}`)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-medium text-gray-400">Thermal Gain</h4>
                      <TrendingUp size={18} className="text-purple-400" />
                    </div>
                    <p className="text-2xl font-bold text-white">{formatThermalGain(maxSingleThermalGain)}</p>
                  </div>
                  <div
                    className="bg-gray-750 rounded-lg p-4 border border-gray-600 cursor-pointer hover:border-blue-500 hover:bg-gray-700 transition"
                    onClick={() => maxClimbRateThermal && navigate(`/sessions/${maxClimbRateThermal.session_id}`)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-medium text-gray-400">Avg Climb Rate</h4>
                      <TrendingUp size={18} className="text-blue-400" />
                    </div>
                    <p className="text-2xl font-bold text-white">{formatClimbRate(maxAvgClimbRate)}</p>
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
