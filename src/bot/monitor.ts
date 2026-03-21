export interface BatchedMessage {
  author: string;
  content: string;
  timestamp: string;
  channelName: string;
}

export class MessageBatcher {
  private batch: BatchedMessage[] = [];
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private maxAgeTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly windowMs: number;
  private readonly maxAgeMs: number;
  private readonly onFlush: (messages: BatchedMessage[]) => void;

  constructor(
    windowMs: number,
    onFlush: (messages: BatchedMessage[]) => void,
    maxAgeMs?: number,
  ) {
    this.windowMs = windowMs;
    this.maxAgeMs = maxAgeMs ?? windowMs * 2;
    this.onFlush = onFlush;
  }

  add(message: BatchedMessage): void {
    this.batch.push(message);

    // Reset idle timer on each new message
    if (this.idleTimer !== null) {
      clearTimeout(this.idleTimer);
    }
    this.idleTimer = setTimeout(() => this.flush(), this.windowMs);

    // Start max-age timer only on the first message in a batch
    if (this.maxAgeTimer === null) {
      this.maxAgeTimer = setTimeout(() => this.flush(), this.maxAgeMs);
    }
  }

  private flush(): void {
    if (this.batch.length === 0) return;

    const messages = [...this.batch];
    this.batch = [];

    if (this.idleTimer !== null) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    if (this.maxAgeTimer !== null) {
      clearTimeout(this.maxAgeTimer);
      this.maxAgeTimer = null;
    }

    this.onFlush(messages);
  }

  destroy(): void {
    if (this.idleTimer !== null) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    if (this.maxAgeTimer !== null) {
      clearTimeout(this.maxAgeTimer);
      this.maxAgeTimer = null;
    }
  }
}
