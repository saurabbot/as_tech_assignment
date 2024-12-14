import React, { useState, useRef } from 'react';
import { Upload, X } from 'lucide-react';
import { FileEncryption } from '../../utils/encryption';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { uploadFile, clearError } from '../../store/slices/fileSlice';

const FileUpload: React.FC<{ onUploadComplete?: () => void }> = ({ onUploadComplete }) => {
  const dispatch = useAppDispatch();
  const { loading, error, uploadProgress } = useAppSelector(state => state.files);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isEncrypting, setIsEncrypting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allowedExtensions = ['.pdf', '.doc', '.docx', '.txt', '.jpg', '.png'];
  const maxSize = 100 * 1024 * 1024; // 100MB

  const validateFile = (file: File) => {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!allowedExtensions.includes(extension)) {
      throw new Error(`File type not supported. Allowed types: ${allowedExtensions.join(', ')}`);
    }

    if (file.size > maxSize) {
      throw new Error(`File size cannot exceed ${maxSize / (1024 * 1024)}MB`);
    }
  };

  const handleFileSelection = (file: File) => {
    dispatch(clearError());
    try {
      validateFile(file);
      setSelectedFile(file);
    } catch (err) {
      if (err instanceof Error) {
        dispatch({ type: 'files/setError', payload: err.message });
      }
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) handleFileSelection(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsEncrypting(true);

    try {
      const { encryptedFile, encryption_salt, encryption_nonce } = 
        await FileEncryption.encryptFile(selectedFile);

      const formData = new FormData();
      formData.append('file', encryptedFile, selectedFile.name);
      formData.append('encryption_salt', encryption_salt);
      formData.append('encryption_nonce', encryption_nonce);
      formData.append('name', selectedFile.name);

      await dispatch(uploadFile(formData)).unwrap();
      setSelectedFile(null);
      onUploadComplete?.();
    } catch (error) {
      // Error handling is done by Redux
    } finally {
      setIsEncrypting(false);
    }
  };
  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center ${
          isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
        } ${error ? 'border-red-300' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept={allowedExtensions.join(',')}
          onChange={(e) => e.target.files?.[0] && handleFileSelection(e.target.files[0])}
        />

        {!selectedFile ? (
          <div>
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-gray-600">
              Drag and drop your file here, or{' '}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-blue-500 hover:text-blue-600"
              >
                browse
              </button>
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Maximum file size: 100MB
            </p>
            <p className="text-sm text-gray-500">
              Supported files: {allowedExtensions.join(', ')}
            </p>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-center space-x-2">
              <span className="text-gray-700">{selectedFile.name}</span>
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <button
              type="button"
              onClick={handleUpload}
              disabled={isEncrypting}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:bg-blue-400"
            >
              {isEncrypting ? 'Encrypting...' : 'Upload File'}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-700 rounded">
          {error}
        </div>
      )}

      {(uploadProgress > 0 || isEncrypting) && (
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded">
            <div
              className="bg-blue-500 rounded h-2 transition-all duration-300"
              style={{ width: `${isEncrypting ? 50 : uploadProgress}%` }}
            />
          </div>
          <p className="text-sm text-gray-600 mt-1 text-center">
            {isEncrypting ? 'Encrypting file...' : 
             uploadProgress === 100 ? 'Upload complete!' : 'Uploading...'}
          </p>
        </div>
      )}

      {uploadProgress === 100 && !isEncrypting && (
        <div className="mt-4 p-3 bg-green-50 text-green-700 rounded">
          File uploaded successfully!
        </div>
      )}
    </div>
  );
};

export default FileUpload;