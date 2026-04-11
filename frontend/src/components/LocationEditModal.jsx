import { useState, useEffect } from 'react';
import { X, MapPin } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function LocationEditModal({ session, onClose, onUpdate }) {
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const response = await fetch(`${API_URL}/api/locations?approved_only=true`);
      const data = await response.json();
      setLocations(data);
      if (session.location_id) {
        setSelectedLocation(session.location_id.toString());
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedLocation) {
      alert('Please select a location');
      return;
    }

    setSaving(true);
    try {
      const ids = session.bulkIds ?? [session.id];
      await Promise.all(ids.map(id =>
        fetch(`${API_URL}/api/sessions/${id}/location?location_id=${selectedLocation}`, { method: 'PUT' })
      ));
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating location:', error);
      alert('Error updating location');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <MapPin size={24} />
            Set Location
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
          >
            <X size={24} />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-gray-400 text-sm mb-2">
            {session.bulkIds
              ? `${session.bulkIds.length} sessions selected`
              : `Session: ${new Date(session.start_time).toLocaleString()}`}
          </p>
        </div>

        {loading ? (
          <p className="text-gray-400">Loading locations...</p>
        ) : (
          <>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Select Location
              </label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Choose a location</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}, {loc.country}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving || !selectedLocation}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={onClose}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
