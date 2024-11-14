import { ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSupabase, initSupabase } from '../config/supabase';
import { s3Client } from '../config/aws';

const BUCKET_NAME = process.env.REACT_APP_S3_BUCKET_NAME;
let initialized = false;

const ensureInitialized = async () => {
  if (!initialized) {
    await initSupabase();
    initialized = true;
  }
};

// Helper function for deleting files
const deleteFile = async (filePath, shareCode) => {
  try {
    await ensureInitialized();
    const supabaseClient = getSupabase();

    // Delete from S3
    const deleteCommand = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: filePath
    });

    await s3Client.send(deleteCommand);

    // Delete from Supabase
    const { error: dbError } = await supabaseClient
      .from('files')
      .delete()
      .eq('share_code', shareCode);

    if (dbError) throw dbError;
  } catch (error) {
    console.error('Delete file error:', error);
    throw error;
  }
};

export const getStorageStats = async () => {
  try {
    await ensureInitialized();
    const supabaseClient = getSupabase();
    
    // Get S3 storage usage
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: 'files'
    });

    const { Contents = [] } = await s3Client.send(command);
    const totalSize = Contents.reduce((acc, obj) => acc + (obj.Size || 0), 0);

    // Get file count from Supabase
    const { count } = await supabaseClient
      .from('files')
      .select('count');

    return {
      totalFiles: Contents.length,
      totalSizeBytes: totalSize,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
      databaseRecords: count
    };
  } catch (error) {
    console.error('Error getting storage stats:', error);
    throw error;
  }
};

export const cleanupExpiredFiles = async () => {
  try {
    await ensureInitialized();
    const supabaseClient = getSupabase();
    
    const { data: expiredFiles, error } = await supabaseClient
      .from('files')
      .select('*')
      .lt('expires_at', new Date().toISOString());

    if (error) throw error;

    if (expiredFiles && expiredFiles.length > 0) {
      console.log(`Found ${expiredFiles.length} expired files to clean up`);
      
      for (const file of expiredFiles) {
        try {
          await deleteFile(file.file_path, file.share_code);
          console.log(`Successfully cleaned up file: ${file.file_name}`);
        } catch (deleteError) {
          console.error(`Failed to delete file ${file.file_name}:`, deleteError);
        }
      }
    }

    return { cleanedCount: expiredFiles?.length || 0 };
  } catch (error) {
    console.error('Error cleaning up files:', error);
    throw error;
  }
};

// Export additional utility functions
export const getStorageUsage = async () => {
  try {
    await ensureInitialized();
    
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: 'files'
    });

    const { Contents = [] } = await s3Client.send(command);
    const totalSize = Contents.reduce((acc, obj) => acc + (obj.Size || 0), 0);
    const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
    const totalSizeGB = (totalSize / (1024 * 1024 * 1024)).toFixed(2);

    return {
      files: Contents.length,
      totalSize,
      totalSizeMB,
      totalSizeGB,
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error getting storage usage:', error);
    throw error;
  }
};