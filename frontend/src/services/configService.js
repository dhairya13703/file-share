let configCache = null;

// Make sure API_URL is properly set
const API_URL = process.env.REACT_APP_API_URL;
const APP_KEY = process.env.REACT_APP_APP_KEY;

if (!API_URL) {
  console.error('API_URL is not configured. Please check your environment variables.');
}

if (!APP_KEY) {
  console.error('APP_KEY is not configured. Please check your environment variables.');
}

const getAuthToken = async () => {
  try {
    console.log('Attempting to get auth token from:', `${API_URL}/auth`);
    
    const response = await fetch(`${API_URL}/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ appKey: APP_KEY })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Auth response not OK:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      throw new Error(errorData.error || 'Authentication failed');
    }

    const { token } = await response.json();
    localStorage.setItem('config_token', token);
    return token;
  } catch (error) {
    console.error('Auth error:', error);
    throw error;
  }
};

const fetchWithAuth = async (endpoint) => {
  let token = localStorage.getItem('config_token');

  try {
    console.log(`Fetching ${endpoint} with${token ? '' : 'out'} existing token`);

    // First attempt with existing token if available
    if (token) {
      const response = await fetch(`${API_URL}/${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        return await response.json();
      }
    }

    // If no token or token expired, get new token
    console.log('Getting new token...');
    token = await getAuthToken();
    
    const response = await fetch(`${API_URL}/${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to fetch ${endpoint}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error);
    throw error;
  }
};

export const getConfig = async () => {
  try {
    // Return cached config if available
    if (configCache) {
      console.log('Returning cached config');
      return configCache;
    }

    console.log('Fetching fresh config...');

    // Fetch all configs in parallel
    const [supabaseConfig, s3Config] = await Promise.all([
      fetchWithAuth('supabase-config'),
      fetchWithAuth('s3-config')
    ]);

    // Combine configs
    configCache = {
      ...supabaseConfig,
      ...s3Config
    };

    console.log('Config fetched successfully');
    return configCache;
  } catch (error) {
    console.error('Error getting config:', error);
    throw error;
  }
};

// Utility to clear config cache
export const clearConfigCache = () => {
  configCache = null;
  localStorage.removeItem('config_token');
  console.log('Config cache cleared');
};