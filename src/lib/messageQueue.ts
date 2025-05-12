import { supabase } from './supabase';

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
  retryCount: number;
  errorMessage?: string;
}

export interface QueueMetrics {
  totalMessages: number;
  processedMessages: number;
  failedMessages: number;
  avgProcessingTime: number;
  currentLength: number;
  consumerCount: number;
}

export class MessageQueue<T = any> {
  private queueName: string;
  private consumerId: string;
  private apiUrl: string;

  constructor(config: QueueConfig) {
    this.queueName = config.name;
    this.consumerId = crypto.randomUUID();
    this.apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/message-queue`;

    // Create queue if it doesn't exist
    this.initQueue(config);
  }

  private async initQueue(config: QueueConfig) {
    try {
      const { error } = await supabase
        .from('message_queues')
        .upsert({
          name: config.name,
          max_size: config.maxSize,
          message_timeout_seconds: config.messageTimeout,
          max_retries: config.maxRetries,
          consumer_count: config.consumerCount,
          auto_scale_threshold: config.autoScaleThreshold,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error initializing queue:', error);
      throw error;
    }
  }

  async enqueue(message: T): Promise<QueueMessage<T>> {
    try {
      const response = await fetch(`${this.apiUrl}?queue=${this.queueName}&action=enqueue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabase.auth.session()?.access_token}`,
        },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        throw new Error(`Failed to enqueue message: ${response.statusText}`);
      }

      const { success, message: queueMessage, error } = await response.json();
      if (!success) throw new Error(error);

      return queueMessage;
    } catch (error) {
      console.error('Error enqueueing message:', error);
      throw error;
    }
  }

  async dequeue(): Promise<QueueMessage<T> | null> {
    try {
      const response = await fetch(
        `${this.apiUrl}?queue=${this.queueName}&action=dequeue&consumer=${this.consumerId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${supabase.auth.session()?.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to dequeue message: ${response.statusText}`);
      }

      const { success, message, error } = await response.json();
      if (!success) throw new Error(error);

      return message;
    } catch (error) {
      console.error('Error dequeuing message:', error);
      throw error;
    }
  }

  async acknowledge(messageId: string, success: boolean, error?: string): Promise<void> {
    try {
      const response = await fetch(`${this.apiUrl}?queue=${this.queueName}&action=ack`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabase.auth.session()?.access_token}`,
        },
        body: JSON.stringify({ messageId, success, error }),
      });

      if (!response.ok) {
        throw new Error(`Failed to acknowledge message: ${response.statusText}`);
      }

      const { success: ackSuccess, error: ackError } = await response.json();
      if (!ackSuccess) throw new Error(ackError);
    } catch (error) {
      console.error('Error acknowledging message:', error);
      throw error;
    }
  }

  async getMetrics(): Promise<QueueMetrics> {
    try {
      const response = await fetch(`${this.apiUrl}?queue=${this.queueName}&action=metrics`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${supabase.auth.session()?.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get metrics: ${response.statusText}`);
      }

      const { success, metrics, error } = await response.json();
      if (!success) throw new Error(error);

      return {
        totalMessages: metrics.total_messages,
        processedMessages: metrics.processed_messages,
        failedMessages: metrics.failed_messages,
        avgProcessingTime: metrics.avg_processing_time,
        currentLength: metrics.current_length,
        consumerCount: metrics.consumer_count,
      };
    } catch (error) {
      console.error('Error getting metrics:', error);
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
            } catch (error) {
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