import { getStorageStats, cleanupExpiredFiles } from './storageManager';

export const monitorUsage = async () => {
  try {
    const stats = await getStorageStats();
    
    // Check if approaching limits
    if (stats.totalSizeBytes > (4.5 * 1024 * 1024 * 1024)) { // 4.5GB
      console.warn('Approaching storage limit!');
      // Trigger cleanup of old files
      await cleanupExpiredFiles();
    }

    return {
      ...stats,
      isNearLimit: stats.totalSizeBytes > (4.5 * 1024 * 1024 * 1024),
      percentageUsed: ((stats.totalSizeBytes / (5 * 1024 * 1024 * 1024)) * 100).toFixed(2)
    };
  } catch (error) {
    console.error('Error monitoring usage:', error);
    throw error;
  }
};