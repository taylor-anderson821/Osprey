import { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useParams, useLocation, Navigate } from 'react-router-dom';
import { BarChart3, Settings as SettingsIcon, Calendar, User } from 'lucide-react';
import SessionDetailMobile from './components/SessionDetail.Mobile';
import DailySummaryMobile from './components/DailySummary.Mobile';
import Settings from './components/Settings';
import ProfileMobile from './components/Profile.Mobile';
import { useAuth } from './context/AuthContext';
import { apiFetch } from './utils/api';

function MobileSessionDetailWrapper({ sessions, onSessionChange }) {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      setLoading(true);
      try {
        const response = await apiFetch(`/api/sessions/${sessionId}`);
        if (response.ok) {
          const data = await response.json();
          const sessionIndex = sessions.findIndex(s => s.id === parseInt(sessionId));
          setSession({ ...data, sessionIndex });
        }
      } catch (error) {
        console.error('Error fetching session detail:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSession();
  }, [sessionId, sessions]);

  if (loading) return <div className="text-white text-center py-8">Loading...</div>;
  if (!session) return <div className="text-white text-center py-8">Session not found</div>;

  return (
    <SessionDetailMobile
      session={session}
      sessions={sessions}
      onBack={() => navigate('/sessions')}
      onSessionChange={onSessionChange}
    />
  );
}

export default function MobileApp() {
  const [sessions, setSessions] = useState([]);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const fetchSessions = async () => {
    try {
      const response = await apiFetch('/api/sessions');
      if (response.ok) {
        const data = await response.json();
        setSessions(data);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  };

  useEffect(() => {
    if (user) fetchSessions();
  }, [user]);

  const handleSessionClick = (sessionId) => {
    navigate(`/sessions/${sessionId}`);
  };

  const handleDateClick = (date) => {
    const session = [...sessions]
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
      .find(s => new Date(s.start_time).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }) === date);
    if (session) navigate(`/sessions/${session.id}`);
  };

  const getActiveTab = () => {
    const path = location.pathname;
    if (path.startsWith('/sessions')) return 'sessions';
    if (path === '/daily') return 'daily';
    if (path === '/settings') return 'settings';
    if (path === '/profile') return 'profile';
    return 'sessions';
  };

  const activeTab = getActiveTab();

  const navLink = (to, tab, Icon, label) => (
    <Link
      to={to}
      className={`flex flex-col items-center gap-0.5 px-4 py-2 transition ${
        activeTab === tab ? 'text-blue-400' : 'text-gray-400 hover:text-gray-200'
      }`}
    >
      <Icon size={20} />
      <span className="text-xs">{label}</span>
    </Link>
  );

  return (
    <div className="min-h-screen bg-gray-900">
      <nav className="bg-gray-800 border-t border-gray-700 fixed bottom-0 left-0 right-0 z-50">
        <div className="flex justify-around py-1">
          {navLink('/profile', 'profile', User, 'Profile')}
          {navLink('/daily', 'daily', Calendar, 'Daily')}
          {navLink('/sessions', 'sessions', BarChart3, 'Sessions')}
          {navLink('/settings', 'settings', SettingsIcon, 'Settings')}
        </div>
      </nav>

      <main className="container mx-auto px-4 pb-24" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 56px)' }}>
        <Routes>
          <Route path="/" element={<Navigate to="/profile" replace />} />
          <Route path="/sessions" element={
            sessions.length > 0
              ? <Navigate to={`/sessions/${sessions[sessions.length - 1].id}`} replace />
              : <div className="text-white text-center py-8">No sessions yet</div>
          } />
          <Route path="/sessions/:sessionId" element={<MobileSessionDetailWrapper sessions={sessions} onSessionChange={handleSessionClick} />} />
          <Route path="/daily" element={<DailySummaryMobile onDateClick={handleDateClick} />} />
          <Route path="/profile" element={<ProfileMobile />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}
