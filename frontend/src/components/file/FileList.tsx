import React, { useEffect } from 'react';
import { Download, Share2, Trash2 } from 'lucide-react';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { fetchFiles, deleteFile, downloadFile } from '../../store/slices/fileSlice';

interface FileListProps {
  onShare?: (fileId: number) => void;
}

const FileList: React.FC<FileListProps> = ({ onShare }) => {
  const dispatch = useAppDispatch();
  const { files, loading, error } = useAppSelector((state) => {
    console.log('Current Redux State:', state); // Debug log
    return state.files;
  });

  useEffect(() => {
    console.log('Fetching files...'); // Debug log
    dispatch(fetchFiles()).then(() => {
      console.log('Fetch files completed'); // Debug log
    });
  }, [dispatch]);
  useEffect(() => {
    console.log('Files in component:', files);
  }, [files]);

  const handleDelete = async (fileId: number) => {
    if (!window.confirm('Are you sure you want to delete this file?')) return;
    try {
      await dispatch(deleteFile(fileId)).unwrap();
      // After successful deletion, files list will update automatically through redux
    } catch (err) {
      console.error('Failed to delete file:', err);
    }
  };

  const handleDownload = async (fileId: number) => {
    try {
      const { blob, fileName } = await dispatch(downloadFile(fileId)).unwrap();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading file:', err);
    }
  };

  if (loading) {
    return (
      <div className="text-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-6">
        <h2 className="text-2xl font-semibold text-gray-900">Your Files</h2>
      </div>
      
      <div className="border-t border-gray-200">
        {files.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No files found. Upload some files to get started.
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {files.map((file) => (
              <li key={file.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-medium text-gray-900 truncate">
                        {file.name}
                      </h3>
                      <span className="flex-shrink-0 text-sm text-gray-500">
                        {formatFileSize(file.file_size)}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-gray-500">
                      Uploaded by {file.owner.full_name || file.owner.email} • 
                      Shared with {file.shared_with_count} users
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => handleDownload(file.id)}
                      className="text-gray-400 hover:text-gray-500"
                      title="Download"
                    >
                      <Download className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => onShare?.(file.id)}
                      className="text-gray-400 hover:text-gray-500"
                      title="Share"
                    >
                      <Share2 className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(file.id)}
                      className="text-gray-400 hover:text-red-500"
                      title="Delete"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

const formatFileSize = (bytes: number) => {
  if (!bytes) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default FileList;