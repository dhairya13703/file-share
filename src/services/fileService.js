import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { supabase } from '../config/supabase';
import { s3Client } from '../config/aws';

const BUCKET_NAME = process.env.REACT_APP_S3_BUCKET_NAME;
const FILE_EXPIRY_DAYS = 7;

// Helper function for share code generation
export const generateShareCode = () => {
  return Math.floor(10000 + Math.random() * 90000).toString();
};

// Helper function for deleting files
const deleteFile = async (filePath, shareCode) => {
  try {
    // Delete from S3
    const deleteCommand = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: filePath
    });

    await s3Client.send(deleteCommand);

    // Delete from Supabase
    const { error: dbError } = await supabase
      .from('files')
      .delete()
      .eq('share_code', shareCode);

    if (dbError) throw dbError;
  } catch (error) {
    console.error('Delete file error:', error);
    throw error;
  }
};

// Upload file function
export const uploadFile = async (file, shareCode, onProgress) => {
  let s3Key = null;
  
  try {
    console.log('Starting upload process for file:', file.name);
    console.log('Share code:', shareCode);

    if (!BUCKET_NAME) {
      throw new Error('S3 bucket name is not configured');
    }

    // Generate S3 key
    s3Key = `files/${shareCode}/${Date.now()}_${file.name}`;
    console.log('Generated S3 key:', s3Key);

    // Upload to S3
    const uploadCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: file,
      ContentType: file.type
    });

    console.log('Uploading to S3...');
    await s3Client.send(uploadCommand);
    console.log('S3 upload successful');

    // Generate download URL
    const getCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
    });

    const downloadUrl = await getSignedUrl(s3Client, getCommand, {
      expiresIn: 3600
    });
    console.log('Generated download URL successfully');

    // Store in Supabase with all required fields
    console.log('Preparing Supabase metadata...');
    const metadata = {
      share_code: shareCode,
      file_name: file.name,
      file_path: s3Key,
      file_size: file.size,
      file_type: file.type,
      s3_url: downloadUrl, // Add the required s3_url field
      expires_at: new Date(Date.now() + (FILE_EXPIRY_DAYS * 24 * 60 * 60 * 1000)).toISOString(),
    };
    console.log('Metadata prepared:', metadata);

    const { data: fileData, error: dbError } = await supabase
      .from('files')
      .insert([metadata])
      .select()
      .single();

    if (dbError) {
      console.error('Supabase insertion error:', dbError);
      console.error('Error details:', {
        code: dbError.code,
        message: dbError.message,
        details: dbError.details
      });
      
      // Cleanup S3 file if Supabase insert fails
      const deleteCommand = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key
      });
      await s3Client.send(deleteCommand);
      
      throw new Error(`Database error: ${dbError.message}`);
    }

    if (!fileData) {
      throw new Error('No data returned from Supabase after insertion');
    }

    console.log('Supabase insertion successful:', fileData);
    return {
      ...fileData,
      download_url: downloadUrl
    };

  } catch (error) {
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });

    // Cleanup S3 file if something fails
    if (s3Key) {
      try {
        const deleteCommand = new DeleteObjectCommand({
          Bucket: BUCKET_NAME,
          Key: s3Key
        });
        await s3Client.send(deleteCommand);
        console.log('Cleaned up S3 file after error');
      } catch (cleanupError) {
        console.error('Failed to clean up S3 file:', cleanupError);
      }
    }

    throw error;
  }
};

// Get file by code
export const getFileByCode = async (shareCode) => {
  try {
    console.log('Fetching file with share code:', shareCode);
    
    const { data: fileData, error: dbError } = await supabase
      .from('files')
      .select('*')
      .eq('share_code', shareCode)
      .single();

    if (dbError) {
      console.error('Supabase fetch error:', dbError);
      throw dbError;
    }

    if (!fileData) {
      throw new Error('File not found or code is invalid');
    }

    // Check expiration
    if (new Date(fileData.expires_at) < new Date()) {
      await deleteFile(fileData.file_path, shareCode);
      throw new Error('File has expired');
    }

    // Generate fresh download URL
    const getCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileData.file_path,
    });

    const downloadUrl = await getSignedUrl(s3Client, getCommand, {
      expiresIn: 3600
    });

    return {
      ...fileData,
      download_url: downloadUrl
    };
  } catch (error) {
    console.error('Get file error:', error);
    throw error;
  }
};

// Download file
export const downloadFile = async (fileData) => {
  try {
    // Check expiration before downloading
    if (new Date(fileData.expires_at) < new Date()) {
      throw new Error('File has expired');
    }

    const response = await fetch(fileData.download_url);
    if (!response.ok) throw new Error('Download failed');

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = fileData.file_name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    // Update download count
    await supabase
      .from('files')
      .update({ downloads_count: (fileData.downloads_count || 0) + 1 })
      .eq('share_code', fileData.share_code);

  } catch (error) {
    console.error('Error downloading file:', error);
    throw error;
  }
};

// Clean up expired files
export const cleanupExpiredFiles = async () => {
  try {
    const { data: expiredFiles, error } = await supabase
      .from('files')
      .select('*')
      .lt('expires_at', new Date().toISOString());

    if (error) throw error;

    for (const file of expiredFiles) {
      await deleteFile(file.file_path, file.share_code);
    }
  } catch (error) {
    console.error('Error cleaning up files:', error);
    throw error;
  }
};