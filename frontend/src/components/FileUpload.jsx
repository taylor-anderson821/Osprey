import { useState } from 'react';
import { Upload, CheckCircle, AlertCircle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function FileUpload({ onSuccess }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

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
