import { useState, useEffect } from 'react';
import { User, MapPin, Save, Plus, Upload } from 'lucide-react';
import { countries } from '../utils/countries';
import { apiFetch } from '../utils/api';

export default function ProfileSetup() {
  const [profile, setProfile] = useState(null);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showLocationForm, setShowLocationForm] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    photo_url: '',
    home_location_id: null
  });
  const [locationFormData, setLocationFormData] = useState({
    name: '',
    country: '',
    latitude: '',
    longitude: ''
  });

  useEffect(() => {
    fetchProfile();
    fetchLocations();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await apiFetch('/api/profile');
      const data = await response.json();
      setProfile(data);
      setFormData({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        photo_url: data.photo_url || '',
        home_location_id: data.home_location_id || null
      });
      setPhotoPreview(data.photo_url || '');
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
        setFormData(prev => ({ ...prev, photo_url: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await apiFetch('/api/locations');
      const data = await response.json();
      setLocations(data);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await apiFetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        alert('Profile updated successfully!');
      } else {
        alert('Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Error updating profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value === '' ? null : value
    }));
  };

  const handleLocationChange = (e) => {
    const { name, value } = e.target;
    setLocationFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmitLocation = async (e) => {
    e.preventDefault();
    
    try {
      const response = await apiFetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: locationFormData.name,
          country: locationFormData.country,
          latitude: parseFloat(locationFormData.latitude),
          longitude: parseFloat(locationFormData.longitude)
        }),
      });

      if (response.ok) {
        alert('Location submitted for approval!');
        setLocationFormData({ name: '', country: '', latitude: '', longitude: '' });
        setShowLocationForm(false);
      } else {
        alert('Failed to submit location');
      }
    } catch (error) {
      console.error('Error submitting location:', error);
      alert('Error submitting location');
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div>
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <User size={24} />
        Profile Setup
      </h3>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Photo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Profile Photo
            </label>
            
            {/* File Upload Button */}
            <div className="mb-3">
              <label className="cursor-pointer inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition">
                <Upload size={18} />
                Upload Photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-gray-400 mt-2">
                Upload an image file (JPG, PNG, etc.)
              </p>
            </div>

            {/* Or URL Input */}
            <div className="mb-3">
              <label className="block text-xs text-gray-400 mb-1">Or enter a photo URL</label>
              <input
                type="url"
                name="photo_url"
                value={formData.photo_url}
                onChange={handleChange}
                placeholder="https://example.com/photo.jpg"
                className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Photo Preview */}
            {photoPreview && (
              <div className="mt-3">
                <img
                  src={photoPreview}
                  alt="Profile preview"
                  className="w-24 h-24 rounded-full object-cover border-2 border-gray-600"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>

          {/* First Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              First Name
            </label>
            <input
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              placeholder="Enter your first name"
              className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Last Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Last Name
            </label>
            <input
              type="text"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              placeholder="Enter your last name"
              className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Home Flying Location */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              <MapPin size={16} />
              Home Flying Location
            </label>
            <select
              name="home_location_id"
              value={formData.home_location_id || ''}
              onChange={handleChange}
              className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="">Select a location</option>
              {locations.map(location => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-400 mt-1">
              Don't see your location?{' '}
              <button
                type="button"
                onClick={() => setShowLocationForm(!showLocationForm)}
                className="text-blue-400 hover:text-blue-300 underline"
              >
                Submit a new location
              </button>
            </p>
          </div>

          {/* New Location Form */}
          {showLocationForm && (
            <div className="border border-gray-600 rounded-lg p-4 bg-gray-750">
              <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                <Plus size={16} />
                Submit New Flying Location
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Location Name</label>
                  <input
                    type="text"
                    name="name"
                    value={locationFormData.name}
                    onChange={handleLocationChange}
                    placeholder="e.g., Torrey Pines Gliderport"
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Country</label>
                  <select
                    name="country"
                    value={locationFormData.country}
                    onChange={handleLocationChange}
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    required
                  >
                    <option value="">Select country</option>
                    {countries.map((country) => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Latitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      name="latitude"
                      value={locationFormData.latitude}
                      onChange={handleLocationChange}
                      placeholder="32.8898"
                      className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Longitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      name="longitude"
                      value={locationFormData.longitude}
                      onChange={handleLocationChange}
                      placeholder="-117.2523"
                      className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSubmitLocation}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded text-sm transition"
                >
                  Submit for Approval
                </button>
                <p className="text-xs text-gray-500">
                  Your location will be reviewed by an admin before appearing in the dropdown.
                </p>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <Save size={18} />
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
