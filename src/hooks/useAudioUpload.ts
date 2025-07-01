import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { handleTrackUpload, getTrackMetadata } from '../lib/trackUpload';
import toast from 'react-hot-toast';

interface UploadOptions {
  maxSize?: number; // in bytes
  allowedTypes?: string[];
}

const defaultOptions: UploadOptions = {
  maxSize: 50 * 1024 * 1024, // 50MB
  allowedTypes: ['audio/mpeg', 'audio/wav', 'audio/ogg']
};

export function useAudioUpload(options: UploadOptions = {}) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { user } = useAuth();

  const validateFile = useCallback((file: File, opts: UploadOptions) => {
    const maxSize = opts.maxSize || defaultOptions.maxSize;
    const allowedTypes = opts.allowedTypes || defaultOptions.allowedTypes;

    if (file.size > maxSize) {
      throw new Error(`File size must be less than ${maxSize / (1024 * 1024)}MB`);
    }

    if (!allowedTypes.includes(file.type)) {
      throw new Error(`File type must be one of: ${allowedTypes.join(', ')}`);
    }

    return true;
  }, []);

  const uploadTrack = useCallback(async (file: File) => {
    if (!user) throw new Error('User must be authenticated to upload tracks');

    try {
      setUploading(true);
      setProgress(0);

      // Validate file
      validateFile(file, { ...defaultOptions, ...options });

      // Show metadata extraction progress
      setProgress(10);
      toast.loading('Extracting metadata...');

      const metadata = await getTrackMetadata(file);

      setProgress(30);
      toast.dismiss();
      toast.loading('Uploading track...');

      const result = await handleTrackUpload(file, user.id, metadata); // pass metadata if needed

      setProgress(100);
      toast.dismiss();
      toast.success('Track uploaded successfully');

      return result;
    } catch (error: any) {
      console.error('Error uploading track:', error);
      toast.dismiss();
      toast.error(error.message || 'Failed to upload track');
      throw error;
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, [user, options, validateFile]);

  return {
    uploadTrack,
    uploading,
    progress
  };
}
