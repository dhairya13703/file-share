import CryptoJS from 'crypto-js';

// Generate a random encryption key
export const generateEncryptionKey = () => {
  return CryptoJS.lib.WordArray.random(256/8).toString();
};

// Encrypt file data with the given key
export const encryptFile = async (fileData, encryptionKey) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const wordArray = CryptoJS.lib.WordArray.create(e.target.result);
      const encrypted = CryptoJS.AES.encrypt(wordArray, encryptionKey).toString();
      const encryptedBlob = new Blob([encrypted], { type: 'application/encrypted' });
      resolve(encryptedBlob);
    };
    reader.readAsArrayBuffer(fileData);
  });
};

// Decrypt file data with the given key
export const decryptFile = async (encryptedData, encryptionKey, originalType) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const decrypted = CryptoJS.AES.decrypt(e.target.result, encryptionKey);
      const wordArray = decrypted.toString(CryptoJS.enc.Utf8);
      const typedArray = new Uint8Array(wordArray.match(/[\da-f]{2}/gi).map((h) => parseInt(h, 16)));
      const decryptedBlob = new Blob([typedArray], { type: originalType });
      resolve(decryptedBlob);
    };
    reader.readAsText(encryptedData);
  });
};

// Hash password for storage
export const hashPassword = (password) => {
  return CryptoJS.SHA256(password).toString();
};

// Verify password
export const verifyPassword = (password, storedHash) => {
  const hashedInput = CryptoJS.SHA256(password).toString();
  return hashedInput === storedHash;
};
