import React from 'react';
import { useState, useCallback, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { useDropzone } from 'react-dropzone';
import { PhotoIcon, XMarkIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import TroubleshootingGuide from './TroubleshootingGuide';
import TrackSelector from './TrackSelector';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import type { Store } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreatePlaylistModal({ isOpen, onClose, onSuccess }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const [selectedTracks, setSelectedTracks] = useState<string[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('');
  const { user } = useAuth();

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setStores(data || []);
    } catch (error) {
      console.error('Error fetching stores:', error);
      toast.error('Failed to load stores');
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }
      setCoverImage(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp']
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024 // 5MB
  });

  const handleTrackSelect = (trackIds: string[]) => {
    setSelectedTracks(trackIds);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Please enter a playlist title');
      return;
    }
    if (selectedTracks.length === 0) {
      toast.error('Please select at least one track');
      return;
    }
    if (!selectedStore) {
      toast.error('Please select a store');
      return;
    }

    setLoading(true);
    try {
      let coverUrl = null;
      
      // Upload cover image if provided
      if (coverImage) {
        const fileExt = coverImage.name.split('.').pop();
        const fileName = `${user?.id}/${uuidv4()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('playlist-covers')
          .upload(fileName, coverImage);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('playlist-covers')
          .getPublicUrl(fileName);

        coverUrl = publicUrl;
      }

      // Create the playlist
      const { data: playlist, error: playlistError } = await supabase
        .from('playlists')
        .insert([{
          name: title,
          description,
          is_private: isPrivate,
          cover_url: coverUrl,
          store_id: selectedStore
        }])
        .select()
        .single();

      if (playlistError) throw playlistError;

      // Add tracks to the playlist
      const playlistTracks = selectedTracks.map((trackId, index) => ({
        playlist_id: playlist.id,
        track_id: trackId,
        position: index
      }));

      const { error: tracksError } = await supabase
        .from('playlist_tracks')
        .insert(playlistTracks);

      if (tracksError) throw tracksError;

      toast.success('Playlist created successfully');
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Error creating playlist:', error);
      toast.error(error.message || 'Failed to create playlist');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setIsPrivate(false);
    setCoverImage(null);
    setCoverPreview('');
    setSelectedTracks([]);
    setSelectedStore('');
    onClose();
  };

  return (
    <>
      <Dialog
        open={isOpen}
        onClose={handleClose}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/80" aria-hidden="true" />

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-4xl w-full rounded-xl bg-primary-800 shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-primary-700">
              <Dialog.Title className="text-lg font-medium text-primary-50">
                Create New Playlist
              </Dialog.Title>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowTroubleshooting(true)}
                  className="text-primary-400 hover:text-primary-300"
                >
                  <QuestionMarkCircleIcon className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="text-primary-400 hover:text-primary-300"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-6">
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-primary-200">
                      Title
                    </label>
                    <input
                      type="text"
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="mt-1 block w-full rounded-md border-0 bg-primary-700 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 placeholder:text-primary-400 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
                      placeholder="My Awesome Playlist"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="store" className="block text-sm font-medium text-primary-200">
                      Store
                    </label>
                    <select
                      id="store"
                      value={selectedStore}
                      onChange={(e) => setSelectedStore(e.target.value)}
                      className="mt-1 block w-full rounded-md border-0 bg-primary-700 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
                      required
                    >
                      <option value="">Select a store</option>
                      {stores.map((store) => (
                        <option key={store.id} value={store.id}>
                          {store.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-primary-200">
                      Description
                    </label>
                    <textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className="mt-1 block w-full rounded-md border-0 bg-primary-700 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 placeholder:text-primary-400 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
                      placeholder="Optional description for your playlist"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-primary-200 mb-2">
                      Cover Image
                    </label>
                    <div
                      {...getRootProps()}
                      className={`
                        mt-1 flex justify-center rounded-lg border border-dashed px-6 py-10
                        ${isDragActive
                          ? 'border-primary-500 bg-primary-700/50'
                          : 'border-primary-700 hover:border-primary-600'
                        }
                        ${coverPreview ? 'border-none p-0' : ''}
                      `}
                    >
                      <div className="text-center">
                        <input {...getInputProps()} />
                        {coverPreview ? (
                          <div className="relative group">
                            <img
                              src={coverPreview}
                              alt="Cover preview"
                              className="w-full h-48 object-cover rounded-lg"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCoverImage(null);
                                  setCoverPreview('');
                                }}
                                className="bg-status-errorBg p-2 rounded-full text-primary-50 hover:bg-status-error/80"
                              >
                                <XMarkIcon className="h-5 w-5" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <PhotoIcon className="mx-auto h-12 w-12 text-primary-500" />
                            <div className="mt-4 flex text-sm leading-6 text-primary-400">
                              <span className="relative rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-primary-50 shadow-sm hover:bg-primary-500">
                                Upload a file
                              </span>
                              <p className="pl-3">or drag and drop</p>
                            </div>
                            <p className="text-xs leading-5 text-primary-400">
                              PNG, JPG, WebP up to 5MB
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <input
                      id="private"
                      type="checkbox"
                      checked={isPrivate}
                      onChange={(e) => setIsPrivate(e.target.checked)}
                      className="h-4 w-4 rounded border-primary-600 text-primary-500 focus:ring-primary-500"
                    />
                    <label htmlFor="private" className="ml-2 text-sm text-primary-200">
                      Make this playlist private
                    </label>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-primary-200 mb-4">
                    Select Tracks
                  </h3>
                  <TrackSelector
                    selectedTracks={selectedTracks}
                    onTrackSelect={handleTrackSelect}
                    mode="multi"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-md bg-primary-700 px-3 py-2 text-sm font-semibold text-primary-50 shadow-sm hover:bg-primary-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`
                    rounded-md bg-primary-500 px-3 py-2 text-sm font-semibold text-primary-50 shadow-sm
                    hover:bg-primary-400 focus-visible:outline focus-visible:outline-2
                    focus-visible:outline-offset-2 focus-visible:outline-primary-500
                    ${loading ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  {loading ? 'Creating...' : 'Create Playlist'}
                </button>
              </div>
            </form>
          </Dialog.Panel>
        </div>
      </Dialog>

      <TroubleshootingGuide
        isOpen={showTroubleshooting}
        onClose={() => setShowTroubleshooting(false)}
      />
    </>
  );
}