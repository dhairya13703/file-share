const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const authMiddleware = require('../middleware/auth');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Helper function to format bytes to MB
const formatBytes = (bytes) => {
  return (bytes / (1024 * 1024)).toFixed(2);
};

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { timeRange = 'all' } = req.query;
    let query = supabase.from('files');

    // Apply time range filter if specified
    if (timeRange !== 'all') {
      const date = new Date();
      if (timeRange === 'week') {
        date.setDate(date.getDate() - 7);
      } else if (timeRange === 'month') {
        date.setMonth(date.getMonth() - 1);
      }
      query = query.gte('created_at', date.toISOString());
    }

    // Get all files for basic stats
    const { data: files, error: filesError } = await query.select('*');
    if (filesError) throw filesError;

    console.log('Files from Supabase:', files); // Debug log

    // Calculate basic stats
    const totalFiles = files.length;
    const totalSize = files.reduce((sum, file) => sum + (file.file_size || 0), 0);
    const totalDownloads = files.reduce((sum, file) => sum + (file.downloads_count || 0), 0);
    const protectedFiles = files.filter(file => file.is_password_protected).length;

    // Get recently uploaded files (last 10)
    const recentFiles = files
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10)
      .map(file => ({
        id: file.id,
        file_name: file.file_name,
        share_code: file.share_code,
        file_size: file.file_size,
        created_at: file.created_at,
        downloads_count: file.downloads_count || 0,
        is_password_protected: file.is_password_protected
      }));

    console.log('Recent Files:', recentFiles); // Debug log

    // Get most downloaded files (top 10)
    const popularFiles = [...files]
      .sort((a, b) => (b.downloads_count || 0) - (a.downloads_count || 0))
      .slice(0, 10)
      .map(file => ({
        id: file.id,
        file_name: file.file_name,
        share_code: file.share_code,
        file_size: file.file_size,
        created_at: file.created_at,
        downloads_count: file.downloads_count || 0,
        is_password_protected: file.is_password_protected
      }));

    // Calculate file type distribution
    const fileTypes = files.reduce((acc, file) => {
      const extension = file.file_name.split('.').pop().toLowerCase();
      acc[extension] = (acc[extension] || 0) + 1;
      return acc;
    }, {});

    // Get storage limit from environment variable (default 1GB)
    const storageLimit = parseFloat(process.env.STORAGE_LIMIT_MB || 1024) * 1024 * 1024;

    // Prepare response
    const stats = {
      totalFiles,
      totalSize: formatBytes(totalSize),
      totalDownloads,
      protectedFiles,
      storageLimit: formatBytes(storageLimit),
      recentFiles,
      popularFiles,
      fileTypes,
      storageUsed: (totalSize / storageLimit) * 100
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router;
