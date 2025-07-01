import { parseBlob } from 'music-metadata-browser';
import { supabase } from './supabase';

export async function handleTrackUpload(file: File, userId: string) {
  try {
    // Parse metadata from the audio file
    const metadata = await parseBlob(file);
    const { common, format } = metadata;

    // Extract metadata
    const title = common.title || file.name.replace(/\.[^/.]+$/, "");
    const album = common.album || '';
    const artist = common.artist || '';
    const genre = common.genre || [];
    const durationSeconds = format.duration || 0;

    // Create a unique file path
    const fileExt = file.name.split('.').pop();
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `tracks/${userId}/${Date.now()}_${safeFileName}`;

    // Upload file to Supabase Storage with progress tracking
    const { error: uploadError, data: uploadData } = await supabase.storage
      .from('tracks')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('tracks')
      .getPublicUrl(filePath);

    // Insert track metadata into the database
    const { error: insertError, data: insertData } = await supabase
      .from('tracks')
      .insert([{
        title,
        album,
        artist,
        genre,
        duration_seconds: durationSeconds,
        file_path: filePath,
        file_url: publicUrl, // Store the public URL for easy access
        user_id: userId,
      }])
      .select()
      .single();

    if (insertError) throw insertError;

    return { 
      success: true, 
      track: insertData 
    };
  } catch (error) {
    console.error('Error uploading track:', error);
    throw error;
  }
}

// Function to get track metadata without uploading
export async function getTrackMetadata(file: File) {
  try {
    const metadata = await parseBlob(file);
    const { common, format } = metadata;

    return {
      title: common.title || file.name.replace(/\.[^/.]+$/, ""),
      album: common.album || '',
      artist: common.artist || '',
      albumArtist: common.albumartist || '',
      genre: common.genre || [],
      year: common.year,
      duration: format.duration || 0,
      bitrate: format.bitrate,
      sampleRate: format.sampleRate,
      lossless: format.lossless,
      container: format.container,
      codec: format.codec,
      picture: common.picture?.[0] ? {
        format: common.picture[0].format,
        data: common.picture[0].data,
      } : undefined
    };
  } catch (error) {
    console.error('Error parsing track metadata:', error);
    throw error;
  }
}

// Function to extract album art from metadata
export async function extractAlbumArt(file: File) {
  try {
    const metadata = await parseBlob(file);
    const { common } = metadata;
    
    if (common.picture && common.picture.length > 0) {
      const picture = common.picture[0];
      return {
        format: picture.format,
        data: picture.data,
        dataUrl: `data:${picture.format};base64,${Buffer.from(picture.data).toString('base64')}`
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting album art:', error);
    return null;
  }
}

// Function to optimize track upload performance
export async function optimizeTrackUpload(file: File, userId: string, options = { chunkSize: 5 * 1024 * 1024 }) {
  // For large files, we could implement chunked upload here
  // For now, we'll use the standard upload method
  return handleTrackUpload(file, userId);
}