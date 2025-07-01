import { MessageQueue } from './messageQueue';

export interface WorkerConfig {
  pollInterval?: number;
  batchSize?: number;
  maxConcurrent?: number;
  errorHandler?: (error: Error) => void;
}

export class QueueWorker<T = any> {
  private queue: MessageQueue<T>;
  private handler: (message: T) => Promise<void>;
  private config: Required<WorkerConfig>;
  private running: boolean = false;
  private activeWorkers: number = 0;
  private stopSignal: () => void = () => {};

  constructor(
    queue: MessageQueue<T>,
    handler: (message: T) => Promise<void>,
    config?: WorkerConfig
  ) {
    this.queue = queue;
    this.handler = handler;
    this.config = {
      pollInterval: config?.pollInterval || 1000,
      batchSize: config?.batchSize || 1,
      maxConcurrent: config?.maxConcurrent || 1,
      errorHandler: config?.errorHandler || console.error,
    };
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;

    const processMessage = async () => {
      if (!this.running || this.activeWorkers >= this.config.maxConcurrent) {
        return;
      }

      this.activeWorkers++;

      try {
        const message = await this.queue.dequeue();
        if (message) {
          try {
            await this.handler(message.message);
            await this.queue.acknowledge(message.id, true);
          } catch (error) {
            await this.queue.acknowledge(message.id, false, error.message);
            this.config.errorHandler(error);
          }
        }
      } catch (error) {
        this.config.errorHandler(error);
      } finally {
        this.activeWorkers--;
      }
    };

    const poll = async () => {
      while (this.running) {
        const workers = Array.from(
          { length: this.config.batchSize },
          () => processMessage()
        );

        await Promise.all(workers);
        await new Promise(resolve => setTimeout(resolve, this.config.pollInterval));
      }
    };

    // Start polling
    poll();

    // Set up stop signal
    this.stopSignal = () => {
      this.running = false;
    };
  }

  stop(): void {
    this.stopSignal();
  }

  isRunning(): boolean {
    return this.running;
  }

  getActiveWorkers(): number {
    return this.activeWorkers;
  }
}