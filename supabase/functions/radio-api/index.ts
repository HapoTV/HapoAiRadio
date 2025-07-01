import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const url = new URL(req.url);
    const path = url.pathname;
    const storeId = path.split("/").pop();

    if (!storeId) {
      throw new Error("Store ID is required");
    }

    // Verify the store exists
    const { data: store, error: storeError } = await supabaseClient
      .from("stores")
      .select("id, name, status")
      .eq("id", storeId)
      .single();

    if (storeError) {
      throw new Error(`Store not found: ${storeError.message}`);
    }

    if (req.method === "GET") {
      // Get the current queue for this store
      const { data: queue, error: queueError } = await supabaseClient
        .from("playlist_queue")
        .select(`
          id,
          position,
          source_type,
          metadata,
          tracks (*)
        `)
        .eq("playlist_id", storeId)
        .order("position");

      if (queueError) {
        throw queueError;
      }

      // Check for emergency broadcasts
      const { data: emergency, error: emergencyError } = await supabaseClient
        .from("emergency_queue")
        .select("*")
        .eq("store_id", storeId)
        .eq("is_active", true)
        .lte("start_time", new Date().toISOString())
        .or(`end_time.is.null,end_time.gt.${new Date().toISOString()}`)
        .order("priority", { ascending: false })
        .limit(1);

      if (emergencyError) {
        throw emergencyError;
      }

      // Format the response
      const response = {
        store: {
          id: store.id,
          name: store.name,
          status: store.status,
        },
        queue: queue.map((item) => ({
          id: item.id,
          position: item.position,
          sourceType: item.source_type,
          metadata: item.metadata,
          track: item.tracks,
        })),
        emergency: emergency.length > 0 ? emergency[0] : null,
        timestamp: new Date().toISOString(),
      };

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else if (req.method === "POST") {
      // Handle heartbeat
      const { status, currentTrackId } = await req.json();

      // Update store status
      const { error: updateError } = await supabaseClient
        .from("stores")
        .update({
          status,
          last_heartbeat: new Date().toISOString(),
        })
        .eq("id", storeId);

      if (updateError) {
        throw updateError;
      }

      // If current track is provided, update player session
      if (currentTrackId) {
        const { error: sessionError } = await supabaseClient
          .from("player_sessions")
          .upsert(
            {
              store_id: storeId,
              current_track_id: currentTrackId,
              status: status === "online" ? "playing" : "stopped",
              last_updated: new Date().toISOString(),
            },
            { onConflict: "store_id" }
          );

        if (sessionError) {
          throw sessionError;
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Heartbeat received",
          timestamp: new Date().toISOString(),
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    throw new Error(`Method ${req.method} not allowed`);
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "An error occurred",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});