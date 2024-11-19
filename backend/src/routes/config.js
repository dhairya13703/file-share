const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware/auth');

// Initial auth endpoint to get token
router.post('/auth', (req, res) => {
  try {
    const { appKey } = req.body;
    console.log('Auth request received with key:', appKey);
    
    if (!process.env.APP_KEY) {
      console.error('APP_KEY not set in environment');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    if (appKey !== process.env.APP_KEY) {
      console.error('Invalid app key provided');
      return res.status(401).json({ error: 'Invalid app key' });
    }

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET not set in environment');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const token = jwt.sign(
      { app: 'freeshare' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('Auth successful, token generated');
    res.json({ token });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Get Supabase config
router.get('/supabase-config', authMiddleware, (req, res) => {
  try {
    const config = {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY
    };

    if (!config.supabaseUrl || !config.supabaseAnonKey) {
      console.error('Missing Supabase configuration');
      return res.status(500).json({ error: 'Supabase configuration not available' });
    }

    res.json(config);
  } catch (error) {
    console.error('Error getting Supabase config:', error);
    res.status(500).json({ error: 'Failed to get Supabase configuration' });
  }
});

// Get S3 config
router.get('/s3-config', authMiddleware, (req, res) => {
  try {
    const config = {
      bucketName: process.env.S3_BUCKET_NAME,
      region: process.env.AWS_REGION,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    };

    if (!config.bucketName || !config.region || !config.accessKeyId || !config.secretAccessKey) {
      console.error('Missing S3 configuration');
      return res.status(500).json({ error: 'S3 configuration not available' });
    }

    res.json(config);
  } catch (error) {
    console.error('Error getting S3 config:', error);
    res.status(500).json({ error: 'Failed to get S3 configuration' });
  }
});

// Add this to routes/config.js
// PIN verification endpoint
router.post('/verify-stats-pin', (req, res) => {
  try {
    const { pin } = req.body;
    
    if (!process.env.STATS_PIN) {
      console.error('STATS_PIN not set in environment');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    if (pin !== process.env.STATS_PIN) {
      console.error('Invalid PIN provided');
      return res.status(401).json({ error: 'Invalid PIN' });
    }

    // Generate special token for stats access
    const token = jwt.sign(
      { app: 'freeshare', role: 'stats' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('Stats auth successful, token generated');
    res.json({ success: true, token });
  } catch (error) {
    console.error('Stats auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Add stats endpoint
// In your backend stats endpoint
router.get('/stats', authMiddleware, async (req, res) => {
  try {    
    // Your Supabase client initialization
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    const { data, error } = await supabase
      .from('files')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }
    const stats = {
      totalFiles: data.length,
      recentFiles: data.slice(0, 5),
      totalSize: data.reduce((acc, file) => acc + file.file_size, 0)
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router;