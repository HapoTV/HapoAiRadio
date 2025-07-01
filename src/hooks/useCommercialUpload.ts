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
  allowedTypes: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'video/mp4']
};

export function useCommercialUpload(options: UploadOptions = {}) {
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

  const uploadCommercial = useCallback(async (file: File) => {
    if (!user) throw new Error('User must be authenticated to upload commercials');

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

      // Get duration from file
      let duration = 30; // Default duration in seconds
      if (file.type.startsWith('audio/') || file.type.startsWith('video/')) {
        const audio = document.createElement(file.type.startsWith('audio/') ? 'audio' : 'video');
        audio.preload = 'metadata';
        
        await new Promise((resolve, reject) => {
          audio.onloadedmetadata = () => {
            duration = Math.round(audio.duration);
            resolve(duration);
          };
          audio.onerror = reject;
          audio.src = URL.createObjectURL(file);
        });
      }

      // Create advertisement record
      const { error: dbError } = await supabase
        .from('advertisements')
        .insert([
          {
            title: file.name.replace(`.${fileExt}`, ''),
            file_url: publicUrl,
            duration: duration,
            priority: 1,
            start_date: new Date().toISOString().split('T')[0],
            end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: 'active'
          },
        ]);

      if (dbError) throw dbError;

      toast.success('Commercial uploaded successfully');
      return publicUrl;
    } catch (error: any) {
      console.error('Error uploading commercial:', error);
      toast.error(error.message || 'Failed to upload commercial');
      throw error;
    } finally {
      setUploading(false);
    }
  }, [user, options, validateFile]);

  return {
    uploadCommercial,
    uploading
  };
}