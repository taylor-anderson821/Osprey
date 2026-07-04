import { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useParams, useLocation, Navigate } from 'react-router-dom';
import { Upload, BarChart3, Settings as SettingsIcon, Calendar, User, Shield, LogOut } from 'lucide-react';
import FileUpload from './components/FileUpload';
import SessionList from './components/SessionList';
import SessionDetail from './components/SessionDetail';
import DailySummary from './components/DailySummary';
import Settings from './components/Settings';
import Profile from './components/Profile';
import Admin from './components/Admin';
import { useAuth } from './context/AuthContext';
import { apiFetch } from './utils/api';

function SessionDetailWrapper({ sessions, onSessionChange }) {
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

  if (loading) return <div className="text-white text-center">Loading...</div>;
  if (!session) return <div className="text-white text-center">Session not found</div>;

  return (
    <SessionDetail
      session={session}
      sessions={sessions}
      onBack={() => navigate('/sessions')}
      onSessionChange={onSessionChange}
    />
  );
}

const SESSIONS_PAGE_SIZE = 100;

export default function DesktopApp() {
  const [sessions, setSessions] = useState([]);
  const [selectedDate, setSelectedDate] = useState('all');
  const [sessionsPage, setSessionsPage] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'admin';
  const navigate = useNavigate();
  const location = useLocation();

  const fetchSessions = async (page = sessionsPage) => {
    try {
      const response = await apiFetch(`/api/sessions?skip=${page * SESSIONS_PAGE_SIZE}&limit=${SESSIONS_PAGE_SIZE}`);
      if (response.ok) {
        const data = await response.json();
        setSessions(data);
      }
      const countResponse = await apiFetch('/api/sessions/count');
      if (countResponse.ok) {
        const { total } = await countResponse.json();
        setTotalSessions(total);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSessions(sessionsPage);
    }
  }, [user, sessionsPage]);

  const handleUploadSuccess = () => {
    setSessionsPage(0);
    fetchSessions(0);
    navigate('/sessions');
  };

  const handleSessionsPageChange = (page) => {
    setSessionsPage(page);
  };

  const handleSessionClick = (sessionId) => {
    navigate(`/sessions/${sessionId}`);
  };

  const getActiveTab = () => {
    const path = location.pathname;
    if (path.startsWith('/sessions/')) return 'detail';
    if (path === '/sessions') return 'sessions';
    if (path === '/daily') return 'daily';
    if (path === '/upload') return 'upload';
    if (path === '/settings') return 'settings';
    if (path === '/profile') return 'profile';
    if (path === '/admin') return 'admin';
    return 'sessions';
  };

  const activeTab = getActiveTab();

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 text-white shadow-lg border-b border-gray-700">
        <div className="container mx-auto px-4 py-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img
                src="/osprey-logo.png"
                alt="Osprey Logo"
                className="h-10 sm:h-16 w-auto object-contain"
              />
              <div>
                <h1 className="text-xl sm:text-3xl font-bold">
                  <span className="sm:hidden">Osprey</span>
                  <span className="hidden sm:inline">Osprey Soaring Analytics</span>
                </h1>
              </div>
            </div>
            {user && (
              <button
                onClick={() => { logout(); navigate('/login'); }}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition text-sm"
              >
                <LogOut size={16} />
                Sign out
              </button>
            )}
          </div>
        </div>
      </header>

      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4 overflow-x-auto">
          <div className="flex gap-1 sm:gap-4 whitespace-nowrap">
            <Link
              to="/profile"
              className={`px-3 sm:px-4 py-3 font-medium border-b-2 transition flex items-center gap-1 flex-shrink-0 ${
                activeTab === 'profile'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <User size={18} />
              <span className="hidden sm:inline">Profile</span>
            </Link>
            <Link
              to="/daily"
              className={`px-3 sm:px-4 py-3 font-medium border-b-2 transition flex items-center gap-1 flex-shrink-0 ${
                activeTab === 'daily'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <Calendar size={18} />
              <span className="hidden sm:inline">Daily Summary</span>
            </Link>
            <Link
              to="/sessions"
              className={`px-3 sm:px-4 py-3 font-medium border-b-2 transition flex items-center gap-1 flex-shrink-0 ${
                activeTab === 'sessions' || activeTab === 'detail'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <BarChart3 size={18} />
              <span className="hidden sm:inline">Sessions</span>
            </Link>
            {isAdmin && (
              <Link
                to="/admin"
                className={`px-3 sm:px-4 py-3 font-medium border-b-2 transition flex items-center gap-1 flex-shrink-0 ${
                  activeTab === 'admin'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                <Shield size={18} />
                <span className="hidden sm:inline">Admin</span>
              </Link>
            )}
            <Link
              to="/upload"
              className={`px-3 sm:px-4 py-3 font-medium border-b-2 transition flex items-center gap-1 flex-shrink-0 ${
                activeTab === 'upload'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <Upload size={18} />
              <span className="hidden sm:inline">Upload</span>
            </Link>
            <Link
              to="/settings"
              className={`px-3 sm:px-4 py-3 font-medium border-b-2 transition flex items-center gap-1 flex-shrink-0 ${
                activeTab === 'settings'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <SettingsIcon size={18} />
              <span className="hidden sm:inline">Settings</span>
            </Link>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<Navigate to="/profile" replace />} />
          <Route path="/sessions" element={<SessionList sessions={sessions} onSessionClick={handleSessionClick} initialSelectedDate={selectedDate} onSessionDeleted={fetchSessions} page={sessionsPage} pageSize={SESSIONS_PAGE_SIZE} totalCount={totalSessions} onPageChange={handleSessionsPageChange} />} />
          <Route path="/sessions/:sessionId" element={<SessionDetailWrapper sessions={sessions} onSessionChange={handleSessionClick} />} />
          <Route path="/daily" element={<DailySummary onDateClick={(date) => { setSelectedDate(date); navigate('/sessions'); }} />} />
          <Route path="/upload" element={<FileUpload onSuccess={handleUploadSuccess} />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}
