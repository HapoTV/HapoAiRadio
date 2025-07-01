import React from 'react';
import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useCommercialUpload } from '../../hooks/useCommercialUpload';

interface Props {
  onUploadSuccess: () => void;
}

export default function AddCommercialForm({ onUploadSuccess }: Props) {
  const { uploadCommercial, uploading } = useCommercialUpload();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      try {
        await Promise.all(acceptedFiles.map(uploadCommercial));
        onUploadSuccess();
      } catch (error) {
        console.error('Error uploading files:', error);
        // Consider showing a user-friendly message or alert handling here
      }
    },
    [uploadCommercial, onUploadSuccess]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/mpeg': ['.mp3'],
      'audio/wav': ['.wav'],
      'audio/ogg': ['.ogg'],
      'video/mp4': ['.mp4']
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    disabled: uploading
  });

  return (
    <div
      {...getRootProps()}
      className={`relative transition-all duration-200 rounded-md shadow-sm ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${isDragActive ? 'bg-primary-800 scale-105' : 'bg-primary-600'} `}
    >
      <input {...getInputProps()} />
      <button
        type="button"
        disabled={uploading}
        className={`inline-flex items-center rounded-md px-3 py-2 text-sm font-semibold text-white ${uploading ? 'cursor-not-allowed bg-primary-500' : 'cursor-pointer bg-primary-600 hover:bg-primary-500'} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600`}
      >
        <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" />
        {uploading ? 'Uploading...' : 'Upload Commercial'}
      </button>

      {isDragActive && !uploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-primary-700/80 rounded-md">
          <p className="text-primary-50 font-medium">Drop audio files here</p>
        </div>
      )}
    </div>
  );
}