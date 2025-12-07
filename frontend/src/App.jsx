import { useState, useEffect } from 'react';
import { Upload, BarChart3, TrendingUp, Settings as SettingsIcon, Calendar, User, Shield } from 'lucide-react';
import FileUpload from './components/FileUpload';
import SessionList from './components/SessionList';
import SessionDetail from './components/SessionDetail';
import DailySummary from './components/DailySummary';
import Settings from './components/Settings';
import Profile from './components/Profile';
import Admin from './components/Admin';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function App() {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [activeTab, setActiveTab] = useState('sessions');
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState('all');
  const [userProfile, setUserProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

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
    setActiveTab('sessions');
  };

  const handleSessionClick = async (sessionId, sessionIndex) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/sessions/${sessionId}`);
      const data = await response.json();
      setSelectedSession({ ...data, sessionIndex });
      setActiveTab('detail');
    } catch (error) {
      console.error('Error fetching session detail:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 text-white shadow-lg border-b border-gray-700">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <img 
              src="/logo.svg" 
              alt="Osprey Logo" 
              className="h-12 w-12 object-contain"
            />
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <TrendingUp size={32} />
                Osprey Flight Analytics
              </h1>
              <p className="text-gray-400 mt-1">RC Soaring Performance Tracking</p>
            </div>
          </div>
        </div>
      </header>

      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-4 py-3 font-medium border-b-2 transition ${
                activeTab === 'profile'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <User className="inline mr-2" size={18} />
              Profile
            </button>
            <button
              onClick={() => setActiveTab('daily')}
              className={`px-4 py-3 font-medium border-b-2 transition ${
                activeTab === 'daily'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <Calendar className="inline mr-2" size={18} />
              Daily Summary
            </button>
            <button
              onClick={() => setActiveTab('sessions')}
              className={`px-4 py-3 font-medium border-b-2 transition ${
                activeTab === 'sessions' || activeTab === 'detail'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <BarChart3 className="inline mr-2" size={18} />
              Sessions
            </button>
            {isAdmin && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`px-4 py-3 font-medium border-b-2 transition ${
                  activeTab === 'admin'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                <Shield className="inline mr-2" size={18} />
                Admin
              </button>
            )}
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-4 py-3 font-medium border-b-2 transition ${
                activeTab === 'upload'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <Upload className="inline mr-2" size={18} />
              Upload
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-3 font-medium border-b-2 transition ${
                activeTab === 'settings'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <SettingsIcon className="inline mr-2" size={18} />
              Settings
            </button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        {activeTab === 'upload' && <FileUpload onSuccess={handleUploadSuccess} />}
        {activeTab === 'sessions' && (
          <SessionList 
            sessions={sessions} 
            onSessionClick={handleSessionClick}
            initialSelectedDate={selectedDate}
            onSessionDeleted={fetchSessions}
          />
        )}
        {activeTab === 'detail' && selectedSession && (
          <SessionDetail 
            session={selectedSession} 
            sessions={sessions}
            onBack={() => setActiveTab('sessions')}
            onSessionChange={handleSessionClick}
          />
        )}
        {activeTab === 'daily' && (
          <DailySummary 
            onDateClick={(date) => {
              setSelectedDate(date);
              setActiveTab('sessions');
            }}
          />
        )}
        {activeTab === 'profile' && <Profile />}
        {activeTab === 'admin' && <Admin />}
        {activeTab === 'settings' && <Settings />}
      </main>
    </div>
  );
}

export default App;
