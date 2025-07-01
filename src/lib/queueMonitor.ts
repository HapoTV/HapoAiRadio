import { supabase } from './supabase';
import type { QueueMetrics } from './queue';

export interface QueueAlert {
  type: 'length' | 'latency' | 'error_rate';
  threshold: number;
  currentValue: number;
  message: string;
}

export class QueueMonitor {
  private queueId: string;
  private alertThresholds: {
    maxQueueLength?: number;
    maxLatencySeconds?: number;
    maxErrorRate?: number;
  };

  constructor(
    queueId: string,
    alertThresholds?: {
      maxQueueLength?: number;
      maxLatencySeconds?: number;
      maxErrorRate?: number;
    }
  ) {
    this.queueId = queueId;
    this.alertThresholds = alertThresholds || {};
  }

  async getMetrics(timeRange: { start: Date; end: Date }): Promise<QueueMetrics[]> {
    try {
      const { data, error } = await supabase
        .from('queue_metrics')
        .select('*')
        .eq('queue_id', this.queueId)
        .gte('timestamp', timeRange.start.toISOString())
        .lte('timestamp', timeRange.end.toISOString())
        .order('timestamp', { ascending: true });

      if (error) throw error;

      return data.map(metric => ({
        totalMessages: metric.total_messages,
        processedMessages: metric.processed_messages,
        failedMessages: metric.failed_messages,
        avgProcessingTime: metric.avg_processing_time,
        currentLength: metric.current_length,
        consumerCount: metric.consumer_count,
      }));
    } catch (error) {
      console.error('Error fetching queue metrics:', error);
      throw error;
    }
  }

  async checkAlerts(): Promise<QueueAlert[]> {
    try {
      const { data: metrics, error } = await supabase
        .from('queue_metrics')
        .select('*')
        .eq('queue_id', this.queueId)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;

      const alerts: QueueAlert[] = [];

      if (
        this.alertThresholds.maxQueueLength &&
        metrics.current_length > this.alertThresholds.maxQueueLength
      ) {
        alerts.push({
          type: 'length',
          threshold: this.alertThresholds.maxQueueLength,
          currentValue: metrics.current_length,
          message: `Queue length (${metrics.current_length}) exceeds threshold (${this.alertThresholds.maxQueueLength})`,
        });
      }

      if (
        this.alertThresholds.maxLatencySeconds &&
        metrics.avg_processing_time > this.alertThresholds.maxLatencySeconds
      ) {
        alerts.push({
          type: 'latency',
          threshold: this.alertThresholds.maxLatencySeconds,
          currentValue: metrics.avg_processing_time,
          message: `Average processing time (${metrics.avg_processing_time}s) exceeds threshold (${this.alertThresholds.maxLatencySeconds}s)`,
        });
      }

      if (this.alertThresholds.maxErrorRate && metrics.total_messages > 0) {
        const errorRate = metrics.failed_messages / metrics.total_messages;
        if (errorRate > this.alertThresholds.maxErrorRate) {
          alerts.push({
            type: 'error_rate',
            threshold: this.alertThresholds.maxErrorRate,
            currentValue: errorRate,
            message: `Error rate (${(errorRate * 100).toFixed(2)}%) exceeds threshold (${(this.alertThresholds.maxErrorRate * 100).toFixed(2)}%)`,
          });
        }
      }

      return alerts;
    } catch (error) {
      console.error('Error checking queue alerts:', error);
      throw error;
    }
  }

  async getDeadLetterQueue(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('dead_letter_queue')
        .select('*')
        .eq('queue_id', this.queueId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching dead letter queue:', error);
      throw error;
    }
  }

  async retryDeadLetterMessage(messageId: string): Promise<void> {
    try {
      // Get the message from DLQ
      const { data: dlqMessage, error: fetchError } = await supabase
        .from('dead_letter_queue')
        .select('*')
        .eq('id', messageId)
        .single();

      if (fetchError) throw fetchError;

      // Re-enqueue the message
      const { error: enqueueError } = await supabase
        .from('queue_messages')
        .insert({
          queue_id: this.queueId,
          message: dlqMessage.message,
          status: 'pending',
          retry_count: 0,
        });

      if (enqueueError) throw enqueueError;

      // Remove from DLQ
      const { error: deleteError } = await supabase
        .from('dead_letter_queue')
        .delete()
        .eq('id', messageId);

      if (deleteError) throw deleteError;
    } catch (error) {
      console.error('Error retrying dead letter message:', error);
      throw error;
    }
  }

  async purgeDeadLetterQueue(): Promise<void> {
    try {
      const { error } = await supabase
        .from('dead_letter_queue')
        .delete()
        .eq('queue_id', this.queueId);

      if (error) throw error;
    } catch (error) {
      console.error('Error purging dead letter queue:', error);
      throw error;
    }
  }

  async getQueueStats(): Promise<{
    totalMessages: number;
    pendingMessages: number;
    processingMessages: number;
    completedMessages: number;
    failedMessages: number;
    avgProcessingTime: number;
  }> {
    try {
      const { data, error } = await supabase.rpc('get_queue_stats', {
        queue_id_param: this.queueId
      });

      if (error) {
        // Fallback to manual calculation if RPC fails
        const { data: messages, error: messagesError } = await supabase
          .from('queue_messages')
          .select('status, processing_started_at, completed_at')
          .eq('queue_id', this.queueId);

        if (messagesError) throw messagesError;

        const stats = {
          totalMessages: messages.length,
          pendingMessages: messages.filter(m => m.status === 'pending').length,
          processingMessages: messages.filter(m => m.status === 'processing').length,
          completedMessages: messages.filter(m => m.status === 'completed').length,
          failedMessages: messages.filter(m => m.status === 'failed').length,
          avgProcessingTime: 0
        };

        // Calculate average processing time
        const completedWithTimes = messages.filter(
          m => m.status === 'completed' && m.processing_started_at && m.completed_at
        );

        if (completedWithTimes.length > 0) {
          const totalTime = completedWithTimes.reduce((sum, m) => {
            const start = new Date(m.processing_started_at).getTime();
            const end = new Date(m.completed_at).getTime();
            return sum + (end - start) / 1000; // Convert to seconds
          }, 0);
          
          stats.avgProcessingTime = totalTime / completedWithTimes.length;
        }

        return stats;
      }

      return data;
    } catch (error) {
      console.error('Error getting queue stats:', error);
      throw error;
    }
  }

  async resetQueue(): Promise<void> {
    try {
      // Delete all messages in the queue
      const { error } = await supabase
        .from('queue_messages')
        .delete()
        .eq('queue_id', this.queueId);

      if (error) throw error;
    } catch (error) {
      console.error('Error resetting queue:', error);
      throw error;
    }
  }

  async getConsumers(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('queue_messages')
        .select('consumer_id')
        .eq('queue_id', this.queueId)
        .eq('status', 'processing')
        .is('consumer_id', 'not.null');

      if (error) throw error;

      // Get unique consumer IDs
      return [...new Set(data.map(m => m.consumer_id))];
    } catch (error) {
      console.error('Error getting queue consumers:', error);
      throw error;
    }
  }

  async getQueueHistory(limit = 100): Promise<QueueMessage[]> {
    try {
      const { data, error } = await supabase
        .from('queue_messages')
        .select('*')
        .eq('queue_id', this.queueId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting queue history:', error);
      throw error;
    }
  }

  async getQueueSize(): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('queue_messages')
        .select('id', { count: 'exact' })
        .eq('queue_id', this.queueId)
        .eq('status', 'pending');

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error getting queue size:', error);
      throw error;
    }
  }
}