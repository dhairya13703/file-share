import { supabase } from '../config/supabase';

// Generate a random 5-digit code
export const generateShareCode = () => {
  return Math.floor(10000 + Math.random() * 90000).toString();
};

// Upload file to Supabase Storage
export const uploadFile = async (file, shareCode, onProgress) => {
  try {
    // Create unique file name
    const fileExt = file.name.split('.').pop();
    const fileName = `${shareCode}_${Date.now()}.${fileExt}`;
    const filePath = `${shareCode}/${fileName}`;

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from('files')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('files')
      .getPublicUrl(filePath);

    // Store file metadata in Supabase database
    const { data: fileData, error: dbError } = await supabase
      .from('files')
      .insert([
        {
          share_code: shareCode,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          file_type: file.type,
          public_url: publicUrl,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        }
      ])
      .select()
      .single();

    if (dbError) throw dbError;

    return fileData;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

// Get file data using share code
export const getFileByCode = async (shareCode) => {
  try {
    // Get file metadata from database
    const { data: fileData, error: dbError } = await supabase
      .from('files')
      .select('*')
      .eq('share_code', shareCode)
      .single();

    if (dbError) throw dbError;
    if (!fileData) throw new Error('File not found or code is invalid');

    // Check if file has expired
    if (new Date(fileData.expires_at) < new Date()) {
      await deleteFile(fileData.file_path, shareCode);
      throw new Error('File has expired');
    }

    // Get a fresh download URL with proper headers
    const { data: { signedUrl }, error: signedUrlError } = await supabase.storage
      .from('files')
      .createSignedUrl(fileData.file_path, 60); // URL expires in 60 seconds

    if (signedUrlError) throw signedUrlError;

    return {
      ...fileData,
      download_url: signedUrl
    };
  } catch (error) {
    console.error('Error getting file:', error);
    throw error;
  }
};

// Download file
export const downloadFile = async (fileData) => {
  try {
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
    const { error: updateError } = await supabase
      .from('files')
      .update({ downloads_count: (fileData.downloads_count || 0) + 1 })
      .eq('share_code', fileData.share_code);

    if (updateError) console.error('Error updating download count:', updateError);
  } catch (error) {
    console.error('Error downloading file:', error);
    throw error;
  }
};

// Delete file from storage and database
export const deleteFile = async (filePath, shareCode) => {
  try {
    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('files')
      .remove([filePath]);

    if (storageError) throw storageError;

    // Delete from database
    const { error: dbError } = await supabase
      .from('files')
      .delete()
      .eq('share_code', shareCode);

    if (dbError) throw dbError;
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
};