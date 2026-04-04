import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { Upload, BarChart3, Settings as SettingsIcon, Calendar, User, Shield } from 'lucide-react';
import FileUpload from './components/FileUpload';
import SessionList from './components/SessionList';
import SessionDetail from './components/SessionDetail';
import DailySummary from './components/DailySummary';
import Settings from './components/Settings';
import Profile from './components/Profile';
import Admin from './components/Admin';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function AppContent() {
  const [sessions, setSessions] = useState([]);
  const [selectedDate, setSelectedDate] = useState('all');
  const [userProfile, setUserProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const fetchSessions = async () => {
    try {
      const response = await fetch(`${API_URL}/api/sessions`);
      const data = await response.json();
      setSessions(data);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const response = await fetch(`${API_URL}/api/profile`);
      const data = await response.json();
      setUserProfile(data);
      setIsAdmin(data.role === 'admin');
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  useEffect(() => {
    fetchSessions();
    fetchUserProfile();
  }, []);

  const handleUploadSuccess = () => {
    fetchSessions();
    navigate('/sessions');
  };

  const handleSessionClick = (sessionId, sessionIndex) => {
    navigate(`/sessions/${sessionId}`);
  };

  // Determine active tab from current route
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
          <div className="flex items-center gap-4">
            <img 
              src="/osprey-logo.png" 
              alt="Osprey Logo" 
              className="h-16 w-auto object-contain"
            />
            <div>
              <h1 className="text-3xl font-bold">
                Osprey Soaring Analytics
              </h1>
            </div>
          </div>
        </div>
      </header>

      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4">
          <div className="flex gap-4">
            <Link
              to="/profile"
              className={`px-4 py-3 font-medium border-b-2 transition ${
                activeTab === 'profile'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <User className="inline mr-2" size={18} />
              Profile
            </Link>
            <Link
              to="/daily"
              className={`px-4 py-3 font-medium border-b-2 transition ${
                activeTab === 'daily'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <Calendar className="inline mr-2" size={18} />
              Daily Summary
            </Link>
            <Link
              to="/sessions"
              className={`px-4 py-3 font-medium border-b-2 transition ${
                activeTab === 'sessions' || activeTab === 'detail'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <BarChart3 className="inline mr-2" size={18} />
              Sessions
            </Link>
            {isAdmin && (
              <Link
                to="/admin"
                className={`px-4 py-3 font-medium border-b-2 transition ${
                  activeTab === 'admin'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                <Shield className="inline mr-2" size={18} />
                Admin
              </Link>
            )}
            <Link
              to="/upload"
              className={`px-4 py-3 font-medium border-b-2 transition ${
                activeTab === 'upload'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <Upload className="inline mr-2" size={18} />
              Upload
            </Link>
            <Link
              to="/settings"
              className={`px-4 py-3 font-medium border-b-2 transition ${
                activeTab === 'settings'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <SettingsIcon className="inline mr-2" size={18} />
              Settings
            </Link>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<Profile />} />
          <Route path="/sessions" element={<SessionList sessions={sessions} onSessionClick={handleSessionClick} initialSelectedDate={selectedDate} onSessionDeleted={fetchSessions} />} />
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

function SessionDetailWrapper({ sessions, onSessionChange }) {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_URL}/api/sessions/${sessionId}`);
        const data = await response.json();
        const sessionIndex = sessions.findIndex(s => s.id === parseInt(sessionId));
        setSession({ ...data, sessionIndex });
      } catch (error) {
        console.error('Error fetching session detail:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [sessionId, sessions]);

  if (loading) {
    return <div className="text-white text-center">Loading...</div>;
  }

  if (!session) {
    return <div className="text-white text-center">Session not found</div>;
  }

  return (
    <SessionDetail 
      session={session} 
      sessions={sessions}
      onBack={() => navigate('/sessions')}
      onSessionChange={onSessionChange}
    />
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
