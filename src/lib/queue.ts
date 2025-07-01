import { supabase } from './supabase';
import toast from 'react-hot-toast';

export interface QueueConfig {
  name: string;
  maxSize?: number;
  messageTimeout?: number;
  maxRetries?: number;
  consumerCount?: number;
  autoScaleThreshold?: number;
}

export interface QueueMessage<T = any> {
  id: string;
  message: T;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  priority: number;
  retryCount: number;
  visibleAfter?: string;
  processingStartedAt?: string;
  completedAt?: string;
  errorMessage?: string;
  consumerId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QueueMetrics {
  totalMessages: number;
  processedMessages: number;
  failedMessages: number;
  avgProcessingTime: number;
  currentLength: number;
  consumerCount: number;
}

export class Queue<T = any> {
  private queueId: string;
  private config: Required<QueueConfig>;
  private consumerId: string;

  constructor(config: QueueConfig) {
    this.config = {
      maxSize: 10000,
      messageTimeout: 30,
      maxRetries: 3,
      consumerCount: 1,
      autoScaleThreshold: 1000,
      ...config
    };
    this.consumerId = crypto.randomUUID();
    this.initQueue();
  }

  private async initQueue() {
    try {
      // First check if queue already exists
      const { data: existingQueue, error: fetchError } = await supabase
        .from('message_queues')
        .select('id')
        .eq('name', this.config.name)
        .single();

      if (fetchError) {
        // Only proceed to create a new queue if the error is "no rows returned"
        if (fetchError.code !== 'PGRST116') {
          throw fetchError;
        }
        
        // Queue doesn't exist, create it
        const { data, error } = await supabase
          .from('message_queues')
          .insert({
            name: this.config.name,
            max_size: this.config.maxSize,
            message_timeout_seconds: this.config.messageTimeout,
            max_retries: this.config.maxRetries,
            consumer_count: this.config.consumerCount,
            auto_scale_threshold: this.config.autoScaleThreshold
          })
          .select()
          .single();

        if (error) throw error;
        this.queueId = data.id;
      } else {
        // Queue exists, just store the ID
        this.queueId = existingQueue.id;
      }
    } catch (error) {
      console.error('Error initializing queue:', error);
      toast.error('Failed to initialize queue');
      throw error;
    }
  }

  async enqueue(message: T, priority = 0): Promise<QueueMessage<T>> {
    try {
      // Check if queue is full
      const { count } = await supabase
        .from('queue_messages')
        .select('id', { count: 'exact' })
        .eq('queue_id', this.queueId)
        .eq('status', 'pending');

      if (count && count >= this.config.maxSize) {
        throw new Error('Queue is full');
      }

      // Add message to queue
      const { data, error } = await supabase
        .from('queue_messages')
        .insert({
          queue_id: this.queueId,
          message,
          status: 'pending',
          priority,
          retry_count: 0
        })
        .select()
        .single();

      if (error) throw error;
      return data as QueueMessage<T>;
    } catch (error) {
      console.error('Error enqueueing message:', error);
      toast.error('Failed to enqueue message');
      throw error;
    }
  }

  async dequeue(): Promise<QueueMessage<T> | null> {
    try {
      // Get next message using row-level locking
      const { data: messages, error: dequeueError } = await supabase
        .from('queue_messages')
        .select('*')
        .eq('queue_id', this.queueId)
        .eq('status', 'pending')
        .lte('visible_after', new Date().toISOString())
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(1);

      if (dequeueError) throw dequeueError;
      if (!messages || messages.length === 0) return null;

      const message = messages[0] as QueueMessage<T>;

      // Update message status
      const { error: updateError } = await supabase
        .from('queue_messages')
        .update({
          status: 'processing',
          processing_started_at: new Date().toISOString(),
          consumer_id: this.consumerId,
          visible_after: new Date(Date.now() + this.config.messageTimeout * 1000).toISOString()
        })
        .eq('id', message.id);

      if (updateError) throw updateError;
      return message;
    } catch (error) {
      console.error('Error dequeuing message:', error);
      toast.error('Failed to dequeue message');
      throw error;
    }
  }

  async peek(): Promise<QueueMessage<T> | null> {
    try {
      const { data, error } = await supabase
        .from('queue_messages')
        .select('*')
        .eq('queue_id', this.queueId)
        .eq('status', 'pending')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // Ignore "no rows returned" error
      return data as QueueMessage<T> | null;
    } catch (error) {
      console.error('Error peeking queue:', error);
      toast.error('Failed to peek queue');
      throw error;
    }
  }

  async isEmpty(): Promise<boolean> {
    try {
      const { count, error } = await supabase
        .from('queue_messages')
        .select('id', { count: 'exact' })
        .eq('queue_id', this.queueId)
        .eq('status', 'pending');

      if (error) throw error;
      return count === 0;
    } catch (error) {
      console.error('Error checking if queue is empty:', error);
      toast.error('Failed to check queue status');
      throw error;
    }
  }

  async isFull(): Promise<boolean> {
    try {
      const { count, error } = await supabase
        .from('queue_messages')
        .select('id', { count: 'exact' })
        .eq('queue_id', this.queueId)
        .eq('status', 'pending');

      if (error) throw error;
      return count >= this.config.maxSize;
    } catch (error) {
      console.error('Error checking if queue is full:', error);
      toast.error('Failed to check queue status');
      throw error;
    }
  }

  async acknowledge(messageId: string, success: boolean, error?: string): Promise<void> {
    try {
      const { data: message, error: messageError } = await supabase
        .from('queue_messages')
        .select('*')
        .eq('id', messageId)
        .single();

      if (messageError) throw messageError;

      if (success) {
        // Mark message as completed
        const { error: updateError } = await supabase
          .from('queue_messages')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', messageId);

        if (updateError) throw updateError;
      } else {
        // Handle failure
        const retryCount = (message as QueueMessage<T>).retryCount + 1;

        if (retryCount >= this.config.maxRetries) {
          // Move to dead letter queue
          const { error: dlqError } = await supabase
            .from('dead_letter_queue')
            .insert({
              original_message_id: messageId,
              queue_id: this.queueId,
              message: (message as QueueMessage<T>).message,
              error_message: error || 'Unknown error',
              retry_count: retryCount,
              last_retry_at: new Date().toISOString()
            });

          if (dlqError) throw dlqError;

          // Update original message
          const { error: updateError } = await supabase
            .from('queue_messages')
            .update({
              status: 'failed',
              error_message: error || 'Unknown error',
              retry_count: retryCount
            })
            .eq('id', messageId);

          if (updateError) throw updateError;
        } else {
          // Retry message
          const { error: updateError } = await supabase
            .from('queue_messages')
            .update({
              status: 'pending',
              retry_count: retryCount,
              error_message: error || 'Unknown error',
              visible_after: new Date(Date.now() + Math.pow(2, retryCount) * 1000).toISOString() // Exponential backoff
            })
            .eq('id', messageId);

          if (updateError) throw updateError;
        }
      }
    } catch (error) {
      console.error('Error acknowledging message:', error);
      toast.error('Failed to acknowledge message');
      throw error;
    }
  }

  async getMetrics(): Promise<QueueMetrics> {
    try {
      const { data, error } = await supabase
        .from('queue_metrics')
        .select('*')
        .eq('queue_id', this.queueId)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;

      return {
        totalMessages: data.total_messages,
        processedMessages: data.processed_messages,
        failedMessages: data.failed_messages,
        avgProcessingTime: data.avg_processing_time,
        currentLength: data.current_length,
        consumerCount: data.consumer_count
      };
    } catch (error) {
      console.error('Error fetching queue metrics:', error);
      toast.error('Failed to fetch queue metrics');
      throw error;
    }
  }

  async startConsumer(
    handler: (message: T) => Promise<void>,
    options: { pollInterval?: number } = {}
  ): Promise<() => void> {
    const pollInterval = options.pollInterval || 1000;
    let running = true;

    const poll = async () => {
      while (running) {
        try {
          const message = await this.dequeue();
          if (message) {
            try {
              await handler(message.message);
              await this.acknowledge(message.id, true);
            } catch (error: any) {
              await this.acknowledge(message.id, false, error.message);
            }
          }
          await new Promise(resolve => setTimeout(resolve, pollInterval));
        } catch (error) {
          console.error('Error in message consumer:', error);
          await new Promise(resolve => setTimeout(resolve, pollInterval * 2));
        }
      }
    };

    poll();
    return () => {
      running = false;
    };
  }
}