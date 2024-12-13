import React, { useState } from 'react';
import { Upload, Download, Copy, CheckCircle, AlertCircle, FileText, X, Lock } from 'lucide-react';
import { Alert, AlertDescription } from '../components/ui/alert';
import { uploadFile, getFileByCode, downloadFile } from '../services/fileService';
import toast from 'react-hot-toast';

const FileSharing = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [shareCode, setShareCode] = useState('');
  const [downloadCode, setDownloadCode] = useState('');
  const [uploadPassword, setUploadPassword] = useState('');
  const [downloadPassword, setDownloadPassword] = useState('');
  const [copied, setCopied] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const showAlert = (type, message) => {
    if (type === 'success') {
      toast.success(message);
    } else {
      toast.error(message);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      await handleFileSelection(droppedFile);
    }
  };

  const handleFileSelection = async (selectedFile) => {
    if (selectedFile.size > 1000 * 1024 * 1024) {
      showAlert('error', 'File size must be less than 1000MB');
      return;
    }
    setFile(selectedFile);
  };

  const handleUpload = async () => {
    setUploading(true);
    setUploadProgress(0);

    try {
      const code = Math.floor(10000 + Math.random() * 90000).toString();
      await uploadFile(file, code, uploadPassword || null, (progress) => {
        setUploadProgress(progress);
      });
      setShareCode(code);
      showAlert('success', 'File uploaded successfully!');
    } catch (error) {
      showAlert('error', 'Error uploading file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async () => {
    if (downloadCode.length !== 5) {
      toast.error('Please enter a valid 5-digit code');
      return;
    }

    setDownloading(true);

    try {
      const fileData = await getFileByCode(downloadCode, downloadPassword || null);
      await downloadFile(fileData, downloadPassword || null);
      
      toast.success('Download started!');
      setDownloadCode('');
      setDownloadPassword('');
    } catch (error) {
      console.error('Download error:', error);
      toast.error(error.message || 'Error downloading file. Please check the code and try again.');
    } finally {
      setDownloading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showAlert('success', 'Code copied to clipboard!');
  };

  const clearFile = () => {
    setFile(null);
    setShareCode('');
    setUploadProgress(0);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="grid md:grid-cols-2 gap-8 items-start">
        {/* Upload Section */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-semibold mb-6">Upload File</h2>
          
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-xl p-8 transition-all
              ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
              ${uploading ? 'opacity-50' : 'hover:border-blue-500 hover:bg-blue-50'}`}
          >
            <input
              type="file"
              onChange={(e) => handleFileSelection(e.target.files[0])}
              className="hidden"
              id="fileInput"
              disabled={uploading}
            />
            <label
              htmlFor="fileInput"
              className="cursor-pointer block text-center"
            >
              <Upload className="w-16 h-16 text-blue-500 mx-auto mb-4" />
              <p className="text-gray-700 font-medium mb-2">
                {dragActive ? 'Drop your file here' : 'Drag & drop your file here'}
              </p>
              <p className="text-gray-500 text-sm">or click to browse</p>
              <p className="text-gray-400 text-xs mt-2">Max file size: 1000MB</p>
            </label>
          </div>

          {file && (
            <div className="mt-4 space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg relative">
                <button
                  onClick={clearFile}
                  className="absolute top-2 right-2 p-1 hover:bg-gray-200 rounded-full"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-blue-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password Protection (Optional)
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="password"
                      value={uploadPassword}
                      onChange={(e) => setUploadPassword(e.target.value)}
                      className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                      placeholder="Enter password to protect the file"
                    />
                  </div>
                </div>

                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className={`w-full flex items-center justify-center px-4 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                    ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 mr-2" />
                      Upload File {uploadPassword && '(Password Protected)'}
                    </>
                  )}
                </button>
              </div>

              {uploading && (
                <div className="mt-4">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Uploading... {Math.round(uploadProgress)}%
                  </p>
                </div>
              )}
            </div>
          )}

          {shareCode && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-800">Share Code:</p>
                  <p className="text-2xl font-bold text-blue-900">{shareCode}</p>
                  {uploadPassword && (
                    <p className="text-sm text-blue-600 mt-1">
                      This file is password protected
                    </p>
                  )}
                </div>
                <button
                  onClick={copyToClipboard}
                  className="p-2 hover:bg-blue-100 rounded-full transition-colors"
                >
                  {copied ? (
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  ) : (
                    <Copy className="w-6 h-6 text-blue-500" />
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Download Section */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-semibold mb-6">Download File</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Share Code
              </label>
              <input
                type="text"
                value={downloadCode}
                onChange={(e) => setDownloadCode(e.target.value)}
                placeholder="Enter 5-digit code"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                maxLength={5}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password (if required)
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  value={downloadPassword}
                  onChange={(e) => setDownloadPassword(e.target.value)}
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                  placeholder="Enter password if file is protected"
                />
              </div>
            </div>

            <button
              onClick={handleDownload}
              disabled={downloading || downloadCode.length !== 5}
              className={`w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                ${(downloading || downloadCode.length !== 5) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {downloading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5 mr-2" />
                  Download File
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileSharing;