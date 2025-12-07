import { useState, useEffect } from 'react';
import { Shield, MapPin, Check, X } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function Admin() {
  const [pendingLocations, setPendingLocations] = useState([]);
  const [approvedLocations, setApprovedLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    setLoading(true);
    try {
      // Fetch all locations (approved and pending)
      const response = await fetch(`${API_URL}/api/locations?approved_only=false`);
      const data = await response.json();
      
      setPendingLocations(data.filter(loc => !loc.approved));
      setApprovedLocations(data.filter(loc => loc.approved));
    } catch (error) {
      console.error('Error fetching locations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (locationId) => {
    try {
      const response = await fetch(`${API_URL}/api/locations/${locationId}/approve`, {
        method: 'PUT',
      });

      if (response.ok) {
        await fetchLocations();
      } else {
        alert('Failed to approve location');
      }
    } catch (error) {
      console.error('Error approving location:', error);
      alert('Error approving location');
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Shield size={28} />
        Admin Panel
      </h2>

      {/* Pending Locations */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4 text-yellow-400 flex items-center gap-2">
          <MapPin size={20} />
          Pending Approval ({pendingLocations.length})
        </h3>
        
        {pendingLocations.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 text-gray-400">
            No locations pending approval
          </div>
        ) : (
          <div className="space-y-3">
            {pendingLocations.map(location => (
              <div
                key={location.id}
                className="bg-gray-800 rounded-lg p-4 border border-yellow-600 flex items-center justify-between"
              >
                <div>
                  <h4 className="font-semibold text-white">{location.name}</h4>
                  <p className="text-sm text-gray-400">
                    {location.country}
                  </p>
                  <p className="text-sm text-gray-400">
                    Lat: {location.latitude.toFixed(4)}, Lon: {location.longitude.toFixed(4)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Submitted: {new Date(location.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleApprove(location.id)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center gap-2 transition"
                >
                  <Check size={18} />
                  Approve
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Approved Locations */}
      <div>
        <h3 className="text-xl font-semibold mb-4 text-green-400 flex items-center gap-2">
          <Check size={20} />
          Approved Locations ({approvedLocations.length})
        </h3>
        
        {approvedLocations.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 text-gray-400">
            No approved locations yet
          </div>
        ) : (
          <div className="space-y-2">
            {approvedLocations.map(location => (
              <div
                key={location.id}
                className="bg-gray-800 rounded-lg p-4 border border-gray-700"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-white">{location.name}</h4>
                    <p className="text-sm text-gray-400">
                      {location.country}
                    </p>
                    <p className="text-sm text-gray-400">
                      Lat: {location.latitude.toFixed(4)}, Lon: {location.longitude.toFixed(4)}
                    </p>
                  </div>
                  <div className="text-green-500">
                    <Check size={24} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
