import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { Playlist } from '../../types';
import { Link } from 'react-router-dom';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface Props {
  playlistId: string;
}

export default function PlaylistRelationships({ playlistId }: Props) {
  const [relatedPlaylists, setRelatedPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (playlistId) {
      fetchRelatedPlaylists();
    }
  }, [playlistId]);

  const fetchRelatedPlaylists = async () => {
    try {
      const { data, error } = await supabase
        .from('playlist_relationships')
        .select(`
          relationship_type,
          relationship_strength,
          related_playlist:related_playlist_id (
            id,
            name,
            description,
            cover_url
          )
        `)
        .eq('source_playlist_id', playlistId)
        .order('relationship_strength', { ascending: false });

      if (error) throw error;

      const playlists = data
        .map(item => ({
          ...item.related_playlist,
          relationshipType: item.relationship_type,
          relationshipStrength: item.relationship_strength
        }))
        .filter(playlist => playlist !== null);

      setRelatedPlaylists(playlists);
    } catch (error) {
      console.error('Error fetching related playlists:', error);
      toast.error('Failed to load related playlists');
    } finally {
      setLoading(false);
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

  if (relatedPlaylists.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-primary-400">No related playlists found</p>
        <button
          onClick={fetchRelatedPlaylists}
          className="mt-4 inline-flex items-center text-primary-500 hover:text-primary-400"
        >
          <ArrowPathIcon className="h-5 w-5 mr-2" />
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-primary-50">Related Playlists</h3>
      <div className="grid grid-cols-1 gap-4">
        {relatedPlaylists.map((playlist) => (
          <Link
            key={playlist.id}
            to={`/music?playlist=${playlist.id}`}
            className="block bg-primary-700 rounded-lg p-4 hover:bg-primary-600 transition-colors"
          >
            <div className="flex items-center space-x-4">
              {playlist.cover_url ? (
                <img
                  src={playlist.cover_url}
                  alt={playlist.name}
                  className="h-16 w-16 object-cover rounded-md"
                />
              ) : (
                <div className="h-16 w-16 bg-primary-600 rounded-md" />
              )}
              <div>
                <h4 className="text-primary-50 font-medium">{playlist.name}</h4>
                {playlist.description && (
                  <p className="text-sm text-primary-400 line-clamp-2">
                    {playlist.description}
                  </p>
                )}
                <div className="mt-2">
                  <span className="inline-flex items-center rounded-full bg-primary-800 px-2.5 py-0.5 text-xs font-medium text-primary-300">
                    {playlist.relationshipType.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}