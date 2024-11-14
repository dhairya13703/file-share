let config = null;
let configPromise = null;

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const APP_KEY = process.env.REACT_APP_APP_KEY;

export const getConfig = async () => {
  // Return cached config if available
  if (config) return config;

  // Return existing promise if request is in progress
  if (configPromise) return configPromise;

  configPromise = (async () => {
    try {
      // Get auth token
      const authResponse = await fetch(`${API_URL}/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ appKey: APP_KEY }),
      });

      if (!authResponse.ok) {
        throw new Error('Failed to authenticate');
      }

      const { token } = await authResponse.json();

      // Get config
      const configResponse = await fetch(`${API_URL}/config`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!configResponse.ok) {
        throw new Error('Failed to fetch config');
      }

      config = await configResponse.json();
      return config;
    } catch (error) {
      console.error('Error fetching config:', error);
      throw error;
    } finally {
      configPromise = null;
    }
  })();

  return configPromise;
};