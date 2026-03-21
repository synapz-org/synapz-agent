import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MessageBatcher } from '../../src/bot/monitor.js';

describe('MessageBatcher', () => {
  let batcher: MessageBatcher;
  let onFlush: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    onFlush = vi.fn();
    batcher = new MessageBatcher(5000, onFlush); // 5 second idle window
  });

  it('batches messages within the window', () => {
    batcher.add({ author: 'kurt', content: 'do the thing', timestamp: '2026-03-19T12:00:00Z', channelName: '#comms-chat' });
    batcher.add({ author: 'evan', content: 'sure', timestamp: '2026-03-19T12:00:01Z', channelName: '#comms-chat' });
    expect(onFlush).not.toHaveBeenCalled();
  });

  it('flushes after idle window expires', () => {
    batcher.add({ author: 'kurt', content: 'do the thing', timestamp: '2026-03-19T12:00:00Z', channelName: '#comms-chat' });
    vi.advanceTimersByTime(5001);
    expect(onFlush).toHaveBeenCalledTimes(1);
    expect(onFlush).toHaveBeenCalledWith([
      expect.objectContaining({ author: 'kurt', content: 'do the thing' }),
    ]);
  });

  it('resets idle timer when new message arrives within window', () => {
    batcher.add({ author: 'kurt', content: 'msg 1', timestamp: '2026-03-19T12:00:00Z', channelName: '#comms-chat' });
    vi.advanceTimersByTime(3000);
    batcher.add({ author: 'kurt', content: 'msg 2', timestamp: '2026-03-19T12:00:03Z', channelName: '#comms-chat' });
    vi.advanceTimersByTime(3000);
    expect(onFlush).not.toHaveBeenCalled(); // idle timer reset
    vi.advanceTimersByTime(2001);
    expect(onFlush).toHaveBeenCalledTimes(1);
    expect(onFlush.mock.calls[0][0]).toHaveLength(2);
  });

  it('does not flush empty batches', () => {
    vi.advanceTimersByTime(10000);
    expect(onFlush).not.toHaveBeenCalled();
  });

  it('forces flush at max age even with continuous messages', () => {
    // maxAge defaults to 2x idle window = 10000ms
    // Send messages every 4 seconds (before idle window expires each time)
    batcher.add({ author: 'a', content: '1', timestamp: 't1', channelName: '#c' });
    vi.advanceTimersByTime(4000);
    batcher.add({ author: 'b', content: '2', timestamp: 't2', channelName: '#c' });
    vi.advanceTimersByTime(4000);
    batcher.add({ author: 'c', content: '3', timestamp: 't3', channelName: '#c' });
    // 8000ms elapsed, maxAge is 10000ms
    vi.advanceTimersByTime(2001);
    // maxAge should have triggered at 10000ms
    expect(onFlush).toHaveBeenCalledTimes(1);
    expect(onFlush.mock.calls[0][0]).toHaveLength(3);
  });
});
