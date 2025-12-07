import { useState, useEffect } from 'react';
import { Upload, CheckCircle, AlertCircle, MapPin, Plus } from 'lucide-react';
import { countries } from '../utils/countries';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function FileUpload({ onSuccess }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [newLocation, setNewLocation] = useState({
    name: '',
    country: '',
    latitude: '',
    longitude: ''
  });

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const response = await fetch(`${API_URL}/api/locations?approved_only=true`);
      const data = await response.json();
      setLocations(data);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const handleAddLocation = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/api/locations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newLocation.name,
          country: newLocation.country,
          latitude: parseFloat(newLocation.latitude),
          longitude: parseFloat(newLocation.longitude)
        }),
      });

      if (response.ok) {
        alert('Location submitted for approval!');
        setShowAddLocation(false);
        setNewLocation({ name: '', country: '', latitude: '', longitude: '' });
        fetchLocations();
      }
    } catch (error) {
      console.error('Error adding location:', error);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && (selectedFile.name.endsWith('.TLM') || selectedFile.name.endsWith('.tlm'))) {
      setFile(selectedFile);
      setError(null);
    } else {
      setError('Please select a valid TLM file');
      setFile(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      setResult(data);
      setFile(null);
      onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-gray-800 rounded-lg shadow-md p-8 border border-gray-700">
        <h2 className="text-2xl font-bold mb-6 text-white">Upload TLM File</h2>
        
        <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center bg-gray-900">
          <Upload className="mx-auto text-gray-500 mb-4" size={48} />
          
          <label className="cursor-pointer">
            <span className="text-blue-400 hover:text-blue-300 font-medium">
              Choose a file
            </span>
            <input
              type="file"
              accept=".tlm,.TLM"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
          
          {file && (
            <div className="mt-4 text-sm text-gray-400">
              Selected: <span className="font-medium text-white">{file.name}</span>
            </div>
          )}
        </div>

        {/* Location Selection */}
        {file && (
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              <MapPin size={16} />
              Flying Location (Optional)
            </label>
            <div className="flex gap-2">
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Select a location</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}, {loc.country}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setShowAddLocation(!showAddLocation)}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
                title="Add new location"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Add Location Form */}
        {showAddLocation && (
          <div className="mt-4 p-4 bg-gray-750 border border-gray-600 rounded-lg">
            <h4 className="text-white font-medium mb-3">Add New Location</h4>
            <form onSubmit={handleAddLocation} className="space-y-3">
              <input
                type="text"
                placeholder="Location name"
                required
                value={newLocation.name}
                onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
              />
              <select
                required
                value={newLocation.country}
                onChange={(e) => setNewLocation({ ...newLocation, country: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
              >
                <option value="">Select country</option>
                {countries.map((country) => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  step="any"
                  placeholder="Latitude"
                  required
                  value={newLocation.latitude}
                  onChange={(e) => setNewLocation({ ...newLocation, latitude: e.target.value })}
                  className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                />
                <input
                  type="number"
                  step="any"
                  placeholder="Longitude"
                  required
                  value={newLocation.longitude}
                  onChange={(e) => setNewLocation({ ...newLocation, longitude: e.target.value })}
                  className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm transition"
                >
                  Submit for Approval
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddLocation(false)}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {file && (
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full mt-6 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition"
          >
            {uploading ? 'Processing...' : 'Upload and Process'}
          </button>
        )}

        {result && (
          <div className="mt-6 p-4 bg-green-900 border border-green-700 rounded-lg flex items-start gap-3">
            <CheckCircle className="text-green-400 flex-shrink-0" size={24} />
            <div>
              <p className="font-medium text-green-100">{result.message}</p>
              <p className="text-sm text-green-300 mt-1">
                View your sessions in the Sessions tab
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-6 p-4 bg-red-900 border border-red-700 rounded-lg flex items-start gap-3">
            <AlertCircle className="text-red-400 flex-shrink-0" size={24} />
            <p className="text-red-100">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
