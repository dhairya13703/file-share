import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { supabase } from '../config/supabase';  // Keep Supabase for metadata

const s3Client = new S3Client({
  region: process.env.REACT_APP_AWS_REGION,
  credentials: {
    accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.REACT_APP_S3_BUCKET_NAME;

// Get pre-signed URL for upload
export const getUploadUrl = async (fileName, contentType) => {
  const key = `uploads/${Date.now()}_${fileName}`;
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  return { uploadUrl, key };
};

// Upload file to S3 with progress
export const uploadFile = async (file, shareCode, onProgress) => {
  try {
    // Get pre-signed URL for upload
    const { uploadUrl, key } = await getUploadUrl(file.name, file.type);

    // Upload to S3 using fetch with progress
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = (event.loaded / event.total) * 100;
        onProgress?.(percentComplete);
      }
    };

    await new Promise((resolve, reject) => {
      xhr.open('PUT', uploadUrl, true);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.onload = () => {
        if (xhr.status === 200) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      };
      xhr.onerror = () => reject(new Error('Upload failed'));
      xhr.send(file);
    });

    // Get download URL
    const getCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    const downloadUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 604800 }); // 7 days

    // Store metadata in Supabase
    const { data: fileData, error } = await supabase
      .from('files')
      .insert([
        {
          share_code: shareCode,
          file_name: file.name,
          file_path: key,
          file_size: file.size,
          file_type: file.type,
          public_url: downloadUrl,
          storage_provider: 's3',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return fileData;
  } catch (error) {
    console.error('Error uploading to S3:', error);
    throw error;
  }
};

// Get download URL
export const getDownloadUrl = async (fileKey) => {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey,
  });
  return await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour
};

// Download file with progress
export const downloadFile = async (fileData, onProgress) => {
  try {
    const downloadUrl = await getDownloadUrl(fileData.file_path);
    const response = await fetch(downloadUrl);
    const contentLength = response.headers.get('content-length');
    const total = parseInt(contentLength, 10);
    let loaded = 0;

    const reader = response.body.getReader();
    const chunks = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.length;
      onProgress?.(Math.round((loaded / total) * 100));
    }

    const blob = new Blob(chunks);
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