import React from 'react';
import { useState } from 'react';
import { format } from 'date-fns';
import { ArrowDownTrayIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

interface TopTrack {
  id: string;
  title: string;
  artist: string;
  playCount: number;
}

interface PlaylistData {
  id: string;
  name: string;
  trackCount: number;
  totalPlays: number;
  topTracks: TopTrack[];
}

interface StoreData {
  storeId: string;
  storeName: string;
  playlists: PlaylistData[];
}

interface Props {
  storeData: StoreData[];
  onDownloadCSV: (storeId: string) => void;
}

export default function StorePlaylistAnalytics({ storeData, onDownloadCSV }: Props) {
  const [expandedStores, setExpandedStores] = useState<Record<string, boolean>>({});
  const [expandedPlaylists, setExpandedPlaylists] = useState<Record<string, boolean>>({});

  const toggleStore = (storeId: string) => {
    setExpandedStores(prev => ({
      ...prev,
      [storeId]: !prev[storeId]
    }));
  };

  const togglePlaylist = (playlistId: string) => {
    setExpandedPlaylists(prev => ({
      ...prev,
      [playlistId]: !prev[playlistId]
    }));
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-primary-50">Store Playlist Analytics</h2>
      
      <div className="grid grid-cols-1 gap-6">
        {storeData.map(store => (
          <div key={store.storeId} className="bg-primary-800 rounded-xl overflow-hidden shadow-lg">
            <div 
              className="p-6 border-b border-primary-700 flex justify-between items-center cursor-pointer"
              onClick={() => toggleStore(store.storeId)}
            >
              <div className="flex items-center space-x-2">
                {expandedStores[store.storeId] ? (
                  <ChevronUpIcon className="h-5 w-5 text-primary-400" />
                ) : (
                  <ChevronDownIcon className="h-5 w-5 text-primary-400" />
                )}
                <h3 className="text-lg font-medium text-primary-50">{store.storeName}</h3>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDownloadCSV(store.storeId);
                }}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-primary-50 bg-primary-600 hover:bg-primary-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <ArrowDownTrayIcon className="-ml-0.5 mr-2 h-4 w-4" />
                Download CSV
              </button>
            </div>
            
            {expandedStores[store.storeId] && (
              <div className="p-6 space-y-6">
                {store.playlists.length > 0 ? (
                  store.playlists.map(playlist => (
                    <div key={playlist.id} className="space-y-4">
                      <div 
                        className="flex justify-between items-center cursor-pointer"
                        onClick={() => togglePlaylist(playlist.id)}
                      >
                        <div className="flex items-center space-x-2">
                          {expandedPlaylists[playlist.id] ? (
                            <ChevronUpIcon className="h-4 w-4 text-primary-400" />
                          ) : (
                            <ChevronDownIcon className="h-4 w-4 text-primary-400" />
                          )}
                          <h4 className="text-primary-200 font-medium">{playlist.name}</h4>
                        </div>
                        <div className="text-sm text-primary-400">
                          {playlist.totalPlays} plays • {playlist.trackCount} tracks
                        </div>
                      </div>
                      
                      {expandedPlaylists[playlist.id] && playlist.topTracks.length > 0 && (
                        <div className="bg-primary-700 rounded-lg overflow-hidden">
                          <table className="min-w-full divide-y divide-primary-600">
                            <thead className="bg-primary-700">
                              <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-primary-300 uppercase tracking-wider">
                                  Track
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-primary-300 uppercase tracking-wider">
                                  Artist
                                </th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-primary-300 uppercase tracking-wider">
                                  Plays
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-primary-700 divide-y divide-primary-600">
                              {playlist.topTracks.map(track => (
                                <tr key={track.id}>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary-50">
                                    {track.title}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-300">
                                    {track.artist}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-300 text-right">
                                    {track.playCount}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      
                      {expandedPlaylists[playlist.id] && playlist.topTracks.length === 0 && (
                        <div className="text-center py-4 text-primary-400 bg-primary-700 rounded-lg">
                          No play data available
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-primary-400">
                    No playlists found for this store
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        
        {storeData.length === 0 && (
          <div className="text-center py-8 text-primary-400">
            No store data available
          </div>
        )}
      </div>
    </div>
  );
}