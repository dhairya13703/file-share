import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getSupabase } from '../config/supabase';
import { getConfig } from './configService';
import { getS3Client } from '../config/aws';
import { generateEncryptionKey, encryptFile, decryptFile, hashPassword, verifyPassword } from '../utils/encryption';
import { getCurrentUser } from './authService';
import toast from 'react-hot-toast';

let initialized = false;
let s3Config = null;

const ensureInitialized = async () => {
  if (initialized) return;

  try {
    s3Config = await getConfig();
    initialized = true;
  } catch (error) {
    console.error('Failed to initialize:', error);
    throw new Error('Failed to initialize file service');
  }
};

export const uploadFile = async (file, shareCode, password = null, onProgress) => {
  let s3Key = null;
  
  try {
    await ensureInitialized();
    const supabaseClient = getSupabase();
    const s3Client = await getS3Client();
    const user = await getCurrentUser();

    if (!user) {
      throw new Error('You must be logged in to upload files');
    }

    console.log('Starting upload process:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      shareCode,
      isPasswordProtected: !!password
    });

    if (!s3Config?.bucketName) {
      throw new Error('S3 bucket name is not configured');
    }

    // Generate S3 key
    s3Key = `files/${shareCode}/${Date.now()}_${file.name}`;
    console.log('Generated S3 key:', s3Key);

    // Handle encryption if password is provided
    let fileToUpload = file;
    let encryptionKey = null;
    let passwordHash = null;

    if (password) {
      encryptionKey = generateEncryptionKey();
      passwordHash = hashPassword(password);
      fileToUpload = await encryptFile(file, encryptionKey);
    }

    // Upload to S3
    const uploadCommand = new PutObjectCommand({
      Bucket: s3Config.bucketName,
      Key: s3Key,
      Body: fileToUpload,
      ContentType: password ? 'application/encrypted' : file.type,
      Metadata: {
        'share-code': shareCode,
        'original-name': file.name,
        'original-type': file.type
      }
    });

    console.log('Uploading to S3...');
    await s3Client.send(uploadCommand);
    console.log('S3 upload successful');

    // Generate download URL
    const getCommand = new GetObjectCommand({
      Bucket: s3Config.bucketName,
      Key: s3Key,
    });

    const downloadUrl = await getSignedUrl(s3Client, getCommand, {
      expiresIn: 3600
    });
    console.log('Generated download URL');

    // Store in Supabase
    console.log('Storing metadata in Supabase...');
    const { data: fileData, error: dbError } = await supabaseClient
      .from('files')
      .insert([{
        user_id: user.id,
        share_code: shareCode,
        file_name: file.name,
        file_path: s3Key,
        file_size: file.size,
        file_type: file.type,
        s3_url: `s3://${s3Config.bucketName}/${s3Key}`,
        expires_at: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)).toISOString(),
        is_password_protected: !!password,
        password_hash: passwordHash,
        encryption_key: encryptionKey
      }])
      .select()
      .single();

    if (dbError) {
      console.error('Supabase insertion error:', dbError);
      throw dbError;
    }

    console.log('Upload process completed successfully');
    return {
      ...fileData,
      download_url: downloadUrl
    };

  } catch (error) {
    console.error('Upload error:', {
      message: error.message,
      stack: error.stack,
      type: error.name,
      originalError: error
    });

    // Cleanup S3 file if upload fails
    if (s3Key) {
      try {
        const s3Client = await getS3Client();
        const deleteCommand = new DeleteObjectCommand({
          Bucket: s3Config.bucketName,
          Key: s3Key
        });
        await s3Client.send(deleteCommand);
        console.log('Cleaned up S3 file after error');
      } catch (cleanupError) {
        console.error('Failed to clean up S3 file:', cleanupError);
      }
    }

    throw new Error(`Upload failed: ${error.message}`);
  }
};

export const getFileByCode = async (shareCode, password = null) => {
  try {
    await ensureInitialized();
    const supabaseClient = getSupabase();
    const s3Client = await getS3Client();
    
    console.log('Fetching file with code:', shareCode);
    
    const { data: fileData, error: dbError } = await supabaseClient
      .from('files')
      .select('*')
      .eq('share_code', shareCode)
      .single();

    if (dbError) throw dbError;
    if (!fileData) throw new Error('File not found');

    // Check expiration
    if (new Date(fileData.expires_at) < new Date()) {
      await deleteFile(fileData.file_path, shareCode);
      throw new Error('File has expired');
    }

    // Verify password if file is password protected
    if (fileData.is_password_protected) {
      if (!password) {
        throw new Error('This file is password protected. Please provide a password.');
      }
      if (!verifyPassword(password, fileData.password_hash)) {
        throw new Error('Incorrect password');
      }
    }

    // Generate fresh download URL
    const getCommand = new GetObjectCommand({
      Bucket: s3Config.bucketName,
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

export const downloadFile = async (fileData, password = null) => {
  try {
    await ensureInitialized();
    const supabaseClient = getSupabase();

    if (new Date(fileData.expires_at) < new Date()) {
      throw new Error('File has expired');
    }

    // Verify password if file is password protected
    if (fileData.is_password_protected) {
      if (!password) {
        throw new Error('This file is password protected. Please provide a password.');
      }
      if (!verifyPassword(password, fileData.password_hash)) {
        throw new Error('Incorrect password');
      }
    }

    const response = await fetch(fileData.download_url);
    if (!response.ok) throw new Error('Download failed');

    let blob = await response.blob();

    // Decrypt file if it's password protected
    if (fileData.is_password_protected) {
      blob = await decryptFile(blob, fileData.encryption_key, fileData.file_type);
    }

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileData.file_name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    // Update download count
    await supabaseClient
      .from('files')
      .update({ downloads_count: (fileData.downloads_count || 0) + 1 })
      .eq('share_code', fileData.share_code);

  } catch (error) {
    console.error('Download error:', error);
    throw error;
  }
};

const deleteFile = async (filePath, shareCode) => {
  try {
    await ensureInitialized();
    const supabaseClient = getSupabase();
    const s3Client = await getS3Client();

    // Delete from S3
    const deleteCommand = new DeleteObjectCommand({
      Bucket: s3Config.bucketName,
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
    console.error('Delete error:', error);
    throw error;
  }
};