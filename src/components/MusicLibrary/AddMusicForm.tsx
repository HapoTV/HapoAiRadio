import React from 'react';
import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAudioUpload } from '../../hooks/useAudioUpload';

interface Props {
  onUploadSuccess: () => void;
}

export default function AddMusicForm({ onUploadSuccess }: Props) {
  const { uploadTrack, uploading } = useAudioUpload();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    try {
      await Promise.all(acceptedFiles.map(uploadTrack));
      onUploadSuccess();
    } catch (error) {
      // Error handling is done in useAudioUpload
    }
  }, [uploadTrack, onUploadSuccess]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/mpeg': ['.mp3'],
      'audio/wav': ['.wav'],
      'audio/ogg': ['.ogg']
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    disabled: uploading
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
        {uploading ? 'Uploading...' : 'Upload Track'}
      </button>

      {isDragActive && (
        <div className="absolute inset-0 flex items-center justify-center bg-primary-900/80 rounded-md">
          <p className="text-primary-50 font-medium">Drop audio files here</p>
        </div>
      )}
    </div>
  );
}