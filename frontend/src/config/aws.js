import { S3Client } from '@aws-sdk/client-s3';
import { getConfig } from '../services/configService';

let s3ClientInstance = null;

export const initializeS3Client = async () => {
  if (s3ClientInstance) return s3ClientInstance;

  try {
    const config = await getConfig();
    
    if (!config.region || !config.accessKeyId || !config.secretAccessKey) {
      throw new Error('Missing required AWS configuration');
    }

    s3ClientInstance = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      }
    });

    return s3ClientInstance;
  } catch (error) {
    console.error('Failed to initialize S3 client:', error);
    throw error;
  }
};

export const getS3Client = async () => {
  if (!s3ClientInstance) {
    await initializeS3Client();
  }
  return s3ClientInstance;
};