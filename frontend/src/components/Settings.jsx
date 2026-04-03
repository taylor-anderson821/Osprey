import { Settings as SettingsIcon, User, Ruler, MapPin } from 'lucide-react';
import { useState, useEffect } from 'react';
import ProfileSetup from './ProfileSetup';
import LocationManager from './LocationManager';

export default function Settings() {
  const [units, setUnits] = useState('imperial');
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    // Load saved units or use imperial as default
    const savedUnits = localStorage.getItem('units') || 'imperial';
    setUnits(savedUnits);
  }, []);

  const handleSave = () => {
    localStorage.setItem('units', units);
    // Refresh the page to apply changes
    window.location.reload();
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <SettingsIcon size={28} />
        Settings
      </h2>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-700">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 font-medium transition ${
            activeTab === 'profile'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <User className="inline mr-2" size={18} />
          Profile
        </button>
        <button
          onClick={() => setActiveTab('units')}
          className={`px-4 py-2 font-medium transition ${
            activeTab === 'units'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Ruler className="inline mr-2" size={18} />
          Units
        </button>
        <button
          onClick={() => setActiveTab('locations')}
          className={`px-4 py-2 font-medium transition ${
            activeTab === 'locations'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <MapPin className="inline mr-2" size={18} />
          Locations
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'profile' && (
        <div className="bg-gray-800 rounded-lg shadow-md p-6 border border-gray-700">
          <ProfileSetup />
        </div>
      )}

      {activeTab === 'units' && (
        <div className="bg-gray-800 rounded-lg shadow-md p-6 border border-gray-700">
          <h3 className="text-xl font-bold text-white mb-4">Units of Measure</h3>
          
          <div className="mb-6">
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="imperial"
                  checked={units === 'imperial'}
                  onChange={(e) => setUnits(e.target.value)}
                  className="mr-2"
                />
                <span className="text-white">Imperial (feet)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="metric"
                  checked={units === 'metric'}
                  onChange={(e) => setUnits(e.target.value)}
                  className="mr-2"
                />
                <span className="text-white">Metric (meters)</span>
              </label>
            </div>
          </div>

          <button
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded"
          >
            Save Units
          </button>
        </div>
      )}

      {activeTab === 'locations' && <LocationManager />}
    </div>
  );
}
