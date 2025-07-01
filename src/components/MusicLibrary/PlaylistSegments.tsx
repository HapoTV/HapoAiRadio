import React from 'react';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { PlaylistSegment, AdBreak, SchedulePattern } from '../../types';
import { PlusIcon, ClockIcon, TrashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface Props {
  playlistId: string;
  onUpdate: () => void;
}

export default function PlaylistSegments({ playlistId, onUpdate }: Props) {
  const [segments, setSegments] = useState<PlaylistSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddSegment, setShowAddSegment] = useState(false);
  const [newSegment, setNewSegment] = useState({
    name: '',
    songs_count: 5,
    transition_duration: 2,
    crossfade_enabled: true
  });

  useEffect(() => {
    fetchSegments();
  }, [playlistId]);

  const fetchSegments = async () => {
    try {
      const { data, error } = await supabase
        .from('playlist_segments')
        .select(`
          *,
          ad_breaks (*),
          schedule_patterns (*)
        `)
        .eq('playlist_id', playlistId)
        .order('created_at');

      if (error) throw error;
      setSegments(data || []);
    } catch (error) {
      console.error('Error fetching segments:', error);
      toast.error('Failed to load playlist segments');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSegment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('playlist_segments')
        .insert([
          {
            playlist_id: playlistId,
            ...newSegment
          }
        ])
        .select()
        .single();

      if (error) throw error;

      setSegments([...segments, data]);
      setShowAddSegment(false);
      setNewSegment({
        name: '',
        songs_count: 5,
        transition_duration: 2,
        crossfade_enabled: true
      });
      toast.success('Segment added successfully');
      onUpdate();
    } catch (error) {
      console.error('Error adding segment:', error);
      toast.error('Failed to add segment');
    }
  };

  const handleDeleteSegment = async (segmentId: string) => {
    try {
      const { error } = await supabase
        .from('playlist_segments')
        .delete()
        .eq('id', segmentId);

      if (error) throw error;

      setSegments(segments.filter(s => s.id !== segmentId));
      toast.success('Segment deleted successfully');
      onUpdate();
    } catch (error) {
      console.error('Error deleting segment:', error);
      toast.error('Failed to delete segment');
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-primary-700 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-primary-50">Playlist Segments</h3>
        <button
          type="button"
          onClick={() => setShowAddSegment(true)}
          className="inline-flex items-center rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500"
        >
          <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" />
          Add Segment
        </button>
      </div>

      {showAddSegment && (
        <form onSubmit={handleAddSegment} className="bg-primary-700 p-6 rounded-lg">
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-primary-200">
                Segment Name
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="name"
                  id="name"
                  value={newSegment.name}
                  onChange={(e) => setNewSegment({ ...newSegment, name: e.target.value })}
                  className="block w-full rounded-md border-0 bg-primary-800 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="songs_count" className="block text-sm font-medium text-primary-200">
                Number of Songs
              </label>
              <div className="mt-1">
                <input
                  type="number"
                  name="songs_count"
                  id="songs_count"
                  min="1"
                  value={newSegment.songs_count}
                  onChange={(e) => setNewSegment({ ...newSegment, songs_count: parseInt(e.target.value) })}
                  className="block w-full rounded-md border-0 bg-primary-800 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
                />
              </div>
            </div>

            <div>
              <label htmlFor="transition_duration" className="block text-sm font-medium text-primary-200">
                Transition Duration (seconds)
              </label>
              <div className="mt-1">
                <input
                  type="number"
                  name="transition_duration"
                  id="transition_duration"
                  min="0"
                  value={newSegment.transition_duration}
                  onChange={(e) => setNewSegment({ ...newSegment, transition_duration: parseInt(e.target.value) })}
                  className="block w-full rounded-md border-0 bg-primary-800 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
                />
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                name="crossfade_enabled"
                id="crossfade_enabled"
                checked={newSegment.crossfade_enabled}
                onChange={(e) => setNewSegment({ ...newSegment, crossfade_enabled: e.target.checked })}
                className="h-4 w-4 rounded border-primary-600 text-primary-500 focus:ring-primary-500"
              />
              <label htmlFor="crossfade_enabled" className="ml-2 block text-sm text-primary-200">
                Enable Crossfade
              </label>
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setShowAddSegment(false)}
              className="rounded-md bg-primary-800 px-3 py-2 text-sm font-semibold text-primary-50 shadow-sm hover:bg-primary-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500"
            >
              Add Segment
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {segments.map((segment) => (
          <div key={segment.id} className="bg-primary-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-primary-50 font-medium">{segment.name}</h4>
                <p className="text-sm text-primary-400">
                  {segment.songs_count} songs • {segment.transition_duration}s transitions
                  {segment.crossfade_enabled && ' • Crossfade enabled'}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {/* TODO: Implement schedule management */}}
                  className="p-2 text-primary-400 hover:text-primary-300"
                >
                  <ClockIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this segment?')) {
                      handleDeleteSegment(segment.id);
                    }
                  }}
                  className="p-2 text-status-error hover:text-status-errorHover"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}