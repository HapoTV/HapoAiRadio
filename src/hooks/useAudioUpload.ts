import React from 'react';
import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
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
  const { user } = useAuth();

  const validateFile = useCallback((file: File, opts: UploadOptions) => {
    const maxSize = opts.maxSize || defaultOptions.maxSize;
    const allowedTypes = opts.allowedTypes || defaultOptions.allowedTypes;

    if (file.size > maxSize!) {
      throw new Error(`File size must be less than ${maxSize! / (1024 * 1024)}MB`);
    }

    if (!allowedTypes!.includes(file.type)) {
      throw new Error(`File type must be one of: ${allowedTypes!.join(', ')}`);
    }

    return true;
  }, []);

  const uploadTrack = useCallback(async (file: File) => {
    if (!user) throw new Error('User must be authenticated to upload tracks');

    try {
      setUploading(true);

      // Validate file
      validateFile(file, { ...defaultOptions, ...options });

      // Create unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Math.random()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('tracks')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('tracks')
        .getPublicUrl(fileName);

      // Create track record
      const { error: dbError } = await supabase
        .from('tracks')
        .insert([
          {
            title: file.name.replace(`.${fileExt}`, ''),
            file_url: publicUrl,
            duration: 0, // TODO: Extract duration from audio file
          },
        ]);

      if (dbError) throw dbError;

      toast.success('Track uploaded successfully');
      return publicUrl;
    } catch (error: any) {
      console.error('Error uploading track:', error);
      toast.error(error.message || 'Failed to upload track');
      throw error;
    } finally {
      setUploading(false);
    }
  }, [user, options, validateFile]);

  return {
    uploadTrack,
    uploading
  };
}