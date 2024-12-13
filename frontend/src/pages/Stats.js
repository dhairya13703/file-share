import React, { useState, useEffect } from 'react';
import { HardDrive, FileText, Clock, Lock, Share2, Trash2, BarChart2, Users } from 'lucide-react';
import { getSupabase } from '../config/supabase';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../config/api';

const StatCard = ({ icon: Icon, title, value, color }) => (
  <div className="bg-white rounded-lg shadow p-6">
    <div className="flex items-center">
      <Icon className={`h-8 w-8 ${color} mr-3`} />
      <div>
        <h2 className="text-sm font-medium text-gray-500">{title}</h2>
        <p className="text-2xl font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  </div>
);

const FileList = ({ files, title }) => (
  <div className="bg-white rounded-lg shadow overflow-hidden">
    <div className="px-6 py-4 border-b border-gray-200">
      <h3 className="text-lg font-medium text-gray-900">{title}</h3>
    </div>
    <div className="divide-y divide-gray-200">
      {files.map((file) => (
        <div key={file.id} className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <FileText className="h-5 w-5 text-gray-400 mr-3" />
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900">{file.file_name}</p>
                  <p className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">{file.share_code}</p>
                </div>
                <p className="text-xs text-gray-500">
                  {new Date(file.created_at).toLocaleDateString()} • 
                  {(file.file_size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {file.is_password_protected && (
                <Lock className="h-4 w-4 text-yellow-500" title="Password Protected" />
              )}
              <span className="text-xs text-gray-500">{file.downloads_count || 0} downloads</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const Stats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('all'); // all, week, month

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('statsToken');
        const response = await fetch(`${API_BASE_URL}/stats?timeRange=${timeRange}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) throw new Error('Failed to fetch stats');
        const data = await response.json();
        console.log('Stats data received:', data); // Debug log
        console.log('Recent files:', data.recentFiles); // Debug log
        setStats(data);
      } catch (error) {
        console.error('Error fetching stats:', error);
        toast.error('Failed to load statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [timeRange]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Storage Statistics</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => setTimeRange('all')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              timeRange === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Time
          </button>
          <button
            onClick={() => setTimeRange('week')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              timeRange === 'week'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            This Week
          </button>
          <button
            onClick={() => setTimeRange('month')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              timeRange === 'month'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            This Month
          </button>
        </div>
      </div>

      {stats && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              icon={HardDrive}
              title="Total Files"
              value={stats.totalFiles}
              color="text-blue-500"
            />
            <StatCard
              icon={FileText}
              title="Total Size"
              value={`${(stats.totalSize / (1024 * 1024)).toFixed(2)} MB`}
              color="text-green-500"
            />
            <StatCard
              icon={Share2}
              title="Total Downloads"
              value={stats.totalDownloads}
              color="text-purple-500"
            />
            <StatCard
              icon={Lock}
              title="Protected Files"
              value={stats.protectedFiles}
              color="text-yellow-500"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <FileList
                files={stats.recentFiles || []}
                title="Recently Uploaded Files"
              />
              {stats.popularFiles && stats.popularFiles.length > 0 && (
                <FileList
                  files={stats.popularFiles}
                  title="Most Downloaded Files"
                />
              )}
            </div>
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Storage Usage Trends</h3>
                <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
                  <span>Used: {((stats.totalSize / stats.storageLimit) * 100).toFixed(1)}%</span>
                  <span>{(stats.totalSize / (1024 * 1024)).toFixed(2)} MB of {(stats.storageLimit / (1024 * 1024)).toFixed(2)} MB</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full"
                    style={{ width: `${(stats.totalSize / stats.storageLimit) * 100}%` }}
                  ></div>
                </div>
              </div>

              {stats.fileTypes && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">File Type Distribution</h3>
                  <div className="space-y-4">
                    {Object.entries(stats.fileTypes).map(([type, count]) => (
                      <div key={type}>
                        <div className="flex justify-between text-sm text-gray-500 mb-1">
                          <span>{type}</span>
                          <span>{count} files</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{
                              width: `${(count / stats.totalFiles) * 100}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Stats;