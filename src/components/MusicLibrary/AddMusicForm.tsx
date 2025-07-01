import React from 'react';
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAudioUpload } from '../../hooks/useAudioUpload';
import toast from 'react-hot-toast';

interface Props {
  onUploadSuccess: () => void;
}

export default function AddMusicForm({ onUploadSuccess }: Props) {
  const { uploadTrack, uploading, progress } = useAudioUpload();
  const [previewMetadata, setPreviewMetadata] = useState<any>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    try {
      if (acceptedFiles.length > 5) {
        toast.error('Maximum 5 files can be uploaded at once');
        return;
      }
      
      // Process files sequentially to avoid overwhelming the browser
      for (const file of acceptedFiles) {
        await uploadTrack(file);
      }
      onUploadSuccess();
      setPreviewMetadata(null);
    } catch (error) {
      console.error('Error uploading files:', error);
      // Error handling is done in useAudioUpload
    }
  }, [uploadTrack, onUploadSuccess]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/mpeg': ['.mp3'],
      'audio/wav': ['.wav'],
      'audio/ogg': ['.ogg'],
      'audio/flac': ['.flac'],
      'audio/aac': ['.aac'],
      'audio/m4a': ['.m4a']
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    disabled: uploading,
    maxFiles: 5
  });

  return (
    <div
      {...getRootProps()}
      className={`
        relative cursor-pointer transition-all duration-200
        ${isDragActive ? 'scale-102' : ''}
        ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input {...getInputProps()} />
      <button
        type="button"
        className={`
          inline-flex items-center rounded-md bg-primary-600 px-3 py-2 text-sm 
          font-semibold text-white shadow-sm hover:bg-primary-500 
          focus-visible:outline focus-visible:outline-2 
          focus-visible:outline-offset-2 focus-visible:outline-primary-600
          ${uploading ? 'cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" />
        {uploading ? (
          <div className="flex items-center">
            <span className="mr-2">Uploading...</span>
            <span className="text-xs">{progress.toFixed(0)}%</span>
          </div>
        ) : (
          'Upload Track'
        )}
      </button>

      {isDragActive && (
        <div className="absolute inset-0 flex items-center justify-center bg-primary-900/80 rounded-md">
          <p className="text-primary-50 font-medium">Drop audio files here</p>
        </div>
      )}

      {previewMetadata && (
        <div className="absolute mt-2 p-4 bg-primary-800 rounded-lg shadow-lg z-10 w-64">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium text-primary-50">Track Preview</h3>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setPreviewMetadata(null);
              }}
              className="text-primary-400 hover:text-primary-300"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
          <div className="text-xs text-primary-300 space-y-1">
            <p><span className="text-primary-400">Title:</span> {previewMetadata.title}</p>
            {previewMetadata.artist && <p><span className="text-primary-400">Artist:</span> {previewMetadata.artist}</p>}
            {previewMetadata.album && <p><span className="text-primary-400">Album:</span> {previewMetadata.album}</p>}
            {previewMetadata.genre?.length > 0 && <p><span className="text-primary-400">Genre:</span> {previewMetadata.genre.join(', ')}</p>}
            {previewMetadata.duration && <p><span className="text-primary-400">Duration:</span> {Math.floor(previewMetadata.duration / 60)}:{Math.floor(previewMetadata.duration % 60).toString().padStart(2, '0')}</p>}
          </div>
        </div>
      )}
    </div>
  );
}