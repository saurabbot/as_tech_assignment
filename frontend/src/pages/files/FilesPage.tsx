import  { useState } from 'react';
import FileUpload from '../../components/file/FileUpload';
import FileList from '../../components/file/FileList';
import FileShare from '../../components/file/FileShare';

const FilesPage = () => {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<number | null>(null);

  const handleShare = (fileId: number) => {
    setSelectedFileId(fileId);
    setIsShareModalOpen(true);
  };

  return (
    <div className="space-y-6 p-6">
      <FileUpload onUploadComplete={() => {
      }} />
      <FileList onShare={handleShare} />
      {isShareModalOpen && selectedFileId && (
        <FileShare
          fileId={selectedFileId}
          onClose={() => setIsShareModalOpen(false)}
          onShare={() => {
            setIsShareModalOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default FilesPage;