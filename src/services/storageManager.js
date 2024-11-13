import { ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { supabase } from '../config/supabase';
import { s3Client } from '../config/aws';

const BUCKET_NAME = process.env.REACT_APP_S3_BUCKET_NAME;

export const getStorageStats = async () => {
  try {
    // Get S3 storage usage
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: 'files'
    });

    const { Contents = [] } = await s3Client.send(command);
    const totalSize = Contents.reduce((acc, obj) => acc + (obj.Size || 0), 0);

    // Get file count from Supabase
    const { count } = await supabase
      .from('files')
      .select('count');

    return {
      totalFiles: Contents.length,
      totalSizeBytes: totalSize,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
      databaseRecords: count,
      isNearLimit: totalSize > (4.5 * 1024 * 1024 * 1024), // Warning at 4.5GB
      percentageUsed: ((totalSize / (5 * 1024 * 1024 * 1024)) * 100).toFixed(2)
    };
  } catch (error) {
    console.error('Error getting storage stats:', error);
    return {
      totalFiles: 0,
      totalSizeBytes: 0,
      totalSizeMB: '0',
      databaseRecords: 0,
      isNearLimit: false,
      percentageUsed: '0'
    };
  }
};

export const cleanupExpiredFiles = async () => {
  try {
    // Get expired files from Supabase
    const { data: expiredFiles, error } = await supabase
      .from('files')
      .select('file_path, share_code')
      .lt('expires_at', new Date().toISOString());

    if (error) throw error;

    if (expiredFiles && expiredFiles.length > 0) {
      // Delete from S3
      const deleteCommand = new DeleteObjectsCommand({
        Bucket: BUCKET_NAME,
        Delete: {
          Objects: expiredFiles.map(file => ({ Key: file.file_path }))
        }
      });

      await s3Client.send(deleteCommand);

      // Delete from Supabase
      await supabase
        .from('files')
        .delete()
        .in('share_code', expiredFiles.map(f => f.share_code));

      console.log(`Cleaned up ${expiredFiles.length} expired files`);
    }

    return { filesDeleted: expiredFiles?.length || 0 };
  } catch (error) {
    console.error('Error cleaning up files:', error);
    return { filesDeleted: 0 };
  }
};

export const monitorUsage = async () => {
  try {
    const stats = await getStorageStats();
    return stats;
  } catch (error) {
    console.error('Error monitoring usage:', error);
    throw error;
  }
};

export const initStorageManager = (cleanupIntervalHours = 24) => {
  // Initial cleanup
  cleanupExpiredFiles();

  // Set up periodic cleanup
  setInterval(cleanupExpiredFiles, cleanupIntervalHours * 60 * 60 * 1000);

  console.log(`Storage manager initialized. Cleanup interval: ${cleanupIntervalHours} hours`);
};