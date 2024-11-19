import React, { useState, useEffect } from 'react';
import { HardDrive, FileText } from 'lucide-react';
import { getSupabase, initSupabase } from '../config/supabase';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../config/api';


const Stats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // useEffect(() => {
  //   const fetchStats = async () => {
  //     try {
  //       await initSupabase();
  //       const supabaseClient = getSupabase();
        
  //       const { data, error } = await supabaseClient
  //         .from('files')
  //         .select('*')
  //         .order('created_at', { ascending: false });

  //       if (error) throw error;

  //       setStats({
  //         totalFiles: data.length,
  //         recentFiles: data.slice(0, 5),
  //         totalSize: data.reduce((acc, file) => acc + file.file_size, 0)
  //       });
  //     } catch (error) {
  //       console.error('Error fetching stats:', error);
  //       toast.error('Failed to load statistics');
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  //   fetchStats();
  // }, []);

  // frontend/src/pages/Stats.js
// frontend/src/pages/Stats.js
useEffect(() => {
  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('statsToken');
      console.log('Using token:', token);
      
      const response = await fetch(`${API_BASE_URL}/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Received data:', data);
      
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  fetchStats();
}, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Storage Statistics</h1>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <HardDrive className="h-8 w-8 text-blue-500 mr-3" />
              <div>
                <h2 className="text-sm font-medium text-gray-500">Total Files</h2>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalFiles}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-green-500 mr-3" />
              <div>
                <h2 className="text-sm font-medium text-gray-500">Total Size</h2>
                <p className="text-2xl font-semibold text-gray-900">
                  {(stats.totalSize / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {stats?.recentFiles && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900">Recent Files</h3>
            <div className="mt-4">
              <ul className="divide-y divide-gray-200">
                {stats.recentFiles.map((file) => (
                  <li key={file.id} className="py-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {file.file_name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(file.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-sm text-gray-500">
                        {(file.file_size / (1024 * 1024)).toFixed(2)} MB
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stats;