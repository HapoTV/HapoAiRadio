import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface QueueMessage {
  id: string;
  message: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retry_count: number;
  error_message?: string;
}

interface MessageQueue {
  id: string;
  name: string;
  max_size: number;
  message_timeout_seconds: number;
  max_retries: number;
  consumer_count: number;
  auto_scale_threshold: number;
}

serve(async (req) => {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  );

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const queueName = url.searchParams.get('queue');
    const action = url.searchParams.get('action');

    if (!queueName) {
      throw new Error('Queue name is required');
    }

    // Get queue configuration
    const { data: queueData, error: queueError } = await supabaseClient
      .from('message_queues')
      .select('*')
      .eq('name', queueName)
      .single();

    if (queueError) throw queueError;
    const queue = queueData as MessageQueue;

    switch (action) {
      case 'enqueue': {
        const { message } = await req.json();
        
        // Validate message
        if (!message) {
          throw new Error('Message is required');
        }

        // Check queue size
        const { count } = await supabaseClient
          .from('queue_messages')
          .select('id', { count: 'exact' })
          .eq('queue_id', queue.id)
          .eq('status', 'pending');

        if (count && count >= queue.max_size) {
          throw new Error('Queue is full');
        }

        // Enqueue message
        const { data, error } = await supabaseClient
          .from('queue_messages')
          .insert({
            queue_id: queue.id,
            message,
            status: 'pending',
          })
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, message: data }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      case 'dequeue': {
        const consumerId = url.searchParams.get('consumer');
        if (!consumerId) {
          throw new Error('Consumer ID is required');
        }

        // Get next message using row-level locking
        const { data: messages, error: dequeueError } = await supabaseClient
          .from('queue_messages')
          .select('*')
          .eq('queue_id', queue.id)
          .eq('status', 'pending')
          .lte('visible_after', new Date().toISOString())
          .order('priority', { ascending: false })
          .order('created_at', { ascending: true })
          .limit(1);

        if (dequeueError) throw dequeueError;
        if (!messages || messages.length === 0) {
          return new Response(
            JSON.stringify({ success: true, message: null }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        const message = messages[0] as QueueMessage;

        // Update message status
        const { error: updateError } = await supabaseClient
          .from('queue_messages')
          .update({
            status: 'processing',
            processing_started_at: new Date().toISOString(),
            consumer_id: consumerId,
            visible_after: new Date(Date.now() + queue.message_timeout_seconds * 1000).toISOString(),
          })
          .eq('id', message.id);

        if (updateError) throw updateError;

        return new Response(
          JSON.stringify({ success: true, message }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      case 'ack': {
        const { messageId, success, error } = await req.json();

        if (!messageId) {
          throw new Error('Message ID is required');
        }

        const { data: message, error: messageError } = await supabaseClient
          .from('queue_messages')
          .select('*')
          .eq('id', messageId)
          .single();

        if (messageError) throw messageError;

        if (success) {
          // Mark message as completed
          const { error: updateError } = await supabaseClient
            .from('queue_messages')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
            })
            .eq('id', messageId);

          if (updateError) throw updateError;
        } else {
          // Handle failure
          const retryCount = (message as QueueMessage).retry_count + 1;

          if (retryCount >= queue.max_retries) {
            // Move to dead letter queue
            const { error: dlqError } = await supabaseClient
              .from('dead_letter_queue')
              .insert({
                original_message_id: messageId,
                queue_id: queue.id,
                message: (message as QueueMessage).message,
                error_message: error || 'Unknown error',
                retry_count: retryCount,
                last_retry_at: new Date().toISOString(),
              });

            if (dlqError) throw dlqError;

            // Update original message
            const { error: updateError } = await supabaseClient
              .from('queue_messages')
              .update({
                status: 'failed',
                error_message: error || 'Unknown error',
                retry_count: retryCount,
              })
              .eq('id', messageId);

            if (updateError) throw updateError;
          } else {
            // Retry message
            const { error: updateError } = await supabaseClient
              .from('queue_messages')
              .update({
                status: 'pending',
                retry_count: retryCount,
                error_message: error || 'Unknown error',
                visible_after: new Date(Date.now() + Math.pow(2, retryCount) * 1000).toISOString(), // Exponential backoff
              })
              .eq('id', messageId);

            if (updateError) throw updateError;
          }
        }

        return new Response(
          JSON.stringify({ success: true }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      case 'metrics': {
        const { data: metrics, error: metricsError } = await supabaseClient
          .from('queue_metrics')
          .select('*')
          .eq('queue_id', queue.id)
          .order('timestamp', { ascending: false })
          .limit(1)
          .single();

        if (metricsError) throw metricsError;

        return new Response(
          JSON.stringify({ success: true, metrics }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});