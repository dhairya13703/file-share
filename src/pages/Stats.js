import React, { useState, useEffect } from 'react';
import { HardDrive, FileText, Clock, AlertCircle, Trash2 } from 'lucide-react';
import { getStorageStats, cleanupExpiredFiles } from '../services/storageManager';
import { supabase } from '../config/supabase';
import toast from 'react-hot-toast';

const Stats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentFiles, setRecentFiles] = useState([]);

  const fetchStats = async () => {
    try {
      const storageStats = await getStorageStats();
      setStats(storageStats);

      // Get recent files
      const { data: files } = await supabase
        .from('files')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      
      setRecentFiles(files || []);
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Error fetching storage statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleCleanup = async () => {
    try {
      setLoading(true);
      const result = await cleanupExpiredFiles();
      toast.success(`Cleaned up ${result.filesDeleted} expired files`);
      fetchStats(); // Refresh stats
    } catch (error) {
      toast.error('Error during cleanup');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Storage Statistics</h1>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <HardDrive className="h-6 w-6 text-blue-500 mr-2" />
              <h3 className="text-lg font-medium">Storage Used</h3>
            </div>
            {stats?.isNearLimit && (
              <AlertCircle className="h-5 w-5 text-yellow-500" />
            )}
          </div>
          <p className="mt-2 text-3xl font-semibold">{stats?.totalSizeMB} MB</p>
          <div className="mt-2 h-2 bg-gray-200 rounded-full">
            <div
              className="h-2 bg-blue-500 rounded-full"
              style={{ width: `${stats?.percentageUsed}%` }}
            ></div>
          </div>
          <p className="mt-2 text-sm text-gray-600">{stats?.percentageUsed}% of 5GB used</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <FileText className="h-6 w-6 text-green-500 mr-2" />
            <h3 className="text-lg font-medium">Total Files</h3>
          </div>
          <p className="mt-2 text-3xl font-semibold">{stats?.totalFiles}</p>
          <p className="mt-2 text-sm text-gray-600">Active files in storage</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <Clock className="h-6 w-6 text-purple-500 mr-2" />
            <h3 className="text-lg font-medium">Database Records</h3>
          </div>
          <p className="mt-2 text-3xl font-semibold">{stats?.databaseRecords}</p>
          <p className="mt-2 text-sm text-gray-600">Total tracked files</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <button
            onClick={handleCleanup}
            className="w-full h-full flex flex-col items-center justify-center text-gray-600 hover:text-red-500 transition-colors"
          >
            <Trash2 className="h-6 w-6 mb-2" />
            <span className="font-medium">Run Cleanup</span>
            <span className="text-sm mt-1">Remove expired files</span>
          </button>
        </div>
      </div>

      {/* Recent Files */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-medium mb-4">Recent Files</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Share Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expires
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentFiles.map((file) => (
                <tr key={file.share_code}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {file.file_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {(file.file_size / (1024 * 1024)).toFixed(2)} MB
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {file.share_code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(file.expires_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Stats;