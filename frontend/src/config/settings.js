// src/config/settings.js
export const FILE_SETTINGS = {
  // File expiry in days
  EXPIRY_DAYS: 7,
  
  // Maximum file size in bytes (100MB)
  MAX_FILE_SIZE: 100 * 1024 * 1024,
  
  // Valid file types (empty array means all types allowed)
  ALLOWED_FILE_TYPES: [],
  
  // S3 bucket folder structure
  FOLDER_PREFIX: 'files',
  
  // URL expiry time in seconds (1 hour)
  URL_EXPIRY: 3600
};