import { useState, useEffect } from 'react';
import { MapPin, Plus, Check, Clock, X } from 'lucide-react';
import { countries } from '../utils/countries';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function LocationManager() {
  const [locations, setLocations] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    country: '',
    latitude: '',
    longitude: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const response = await fetch(`${API_URL}/api/locations?approved_only=false`);
      const data = await response.json();
      setLocations(data);
    } catch (error) {
      console.error('Error fetching locations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    // Validate coordinates
    const lat = parseFloat(formData.latitude);
    const lon = parseFloat(formData.longitude);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      setError('Latitude must be between -90 and 90');
      setSubmitting(false);
      return;
    }

    if (isNaN(lon) || lon < -180 || lon > 180) {
      setError('Longitude must be between -180 and 180');
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/locations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          country: formData.country,
          latitude: lat,
          longitude: lon
        }),
      });

      if (response.ok) {
        setSuccess('Location submitted for approval!');
        setFormData({ name: '', country: '', latitude: '', longitude: '' });
        setShowAddForm(false);
        fetchLocations();
      } else {
        setError('Failed to submit location');
      }
    } catch (error) {
      setError('Error submitting location');
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const approvedLocations = locations.filter(loc => loc.approved);
  const pendingLocations = locations.filter(loc => !loc.approved);

  if (loading) {
    return <div className="text-white">Loading locations...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <MapPin size={28} />
          Flying Locations
        </h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
        >
          <Plus size={20} />
          Add New Location
        </button>
      </div>

      {success && (
        <div className="bg-green-900 border border-green-700 text-green-200 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {error && (
        <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Add Location Form */}
      {showAddForm && (
        <div className="bg-gray-800 rounded-lg shadow-md p-6 border border-gray-700">
          <h3 className="text-xl font-semibold text-white mb-4">Add New Location</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Location Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Mount Diablo"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Country *
              </label>
              <select
                required
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Select a country</option>
                {countries.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Latitude * (-90 to 90)
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  placeholder="37.8816"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Longitude * (-180 to 180)
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  placeholder="-121.9142"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit for Approval'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setError('');
                  setFormData({ name: '', country: '', latitude: '', longitude: '' });
                }}
                className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Approved Locations */}
      <div className="bg-gray-800 rounded-lg shadow-md p-6 border border-gray-700">
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Check className="text-green-400" size={24} />
          Approved Locations ({approvedLocations.length})
        </h3>
        {approvedLocations.length === 0 ? (
          <p className="text-gray-400">No approved locations yet.</p>
        ) : (
          <div className="space-y-3">
            {approvedLocations.map((location) => (
              <div
                key={location.id}
                className="bg-gray-750 border border-gray-600 rounded-lg p-4 hover:border-gray-500 transition"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-lg font-semibold text-white">{location.name}</h4>
                    <p className="text-gray-400 text-sm">{location.country}</p>
                    <p className="text-gray-500 text-xs mt-1">
                      {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                    </p>
                  </div>
                  <Check className="text-green-400" size={20} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending Locations */}
      {pendingLocations.length > 0 && (
        <div className="bg-gray-800 rounded-lg shadow-md p-6 border border-gray-700">
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Clock className="text-yellow-400" size={24} />
            Pending Approval ({pendingLocations.length})
          </h3>
          <div className="space-y-3">
            {pendingLocations.map((location) => (
              <div
                key={location.id}
                className="bg-gray-750 border border-yellow-900 rounded-lg p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-lg font-semibold text-white">{location.name}</h4>
                    <p className="text-gray-400 text-sm">{location.country}</p>
                    <p className="text-gray-500 text-xs mt-1">
                      {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                    </p>
                  </div>
                  <Clock className="text-yellow-400" size={20} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
