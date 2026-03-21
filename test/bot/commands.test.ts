import { describe, it, expect } from 'vitest';
import { parseCommand } from '../../src/bot/commands.js';

describe('parseCommand', () => {
  it('parses bare status command', () => {
    expect(parseCommand('status')).toEqual({ type: 'status' });
  });

  it('parses status with repo name', () => {
    expect(parseCommand('status covenant-narrative')).toEqual({
      type: 'status',
      repo: 'covenant-narrative',
    });
  });

  it('parses task command', () => {
    expect(parseCommand('task covenant-narrative: Draft a thread about X')).toEqual({
      type: 'task',
      repo: 'covenant-narrative',
      description: 'Draft a thread about X',
    });
  });

  it('parses approve PR command', () => {
    expect(parseCommand('approve PR covenant-narrative#47')).toEqual({
      type: 'approve',
      repo: 'covenant-narrative',
      number: 47,
    });
  });

  it('parses reject PR command', () => {
    expect(parseCommand('reject PR covenant-narrative#47 needs more context')).toEqual({
      type: 'reject',
      repo: 'covenant-narrative',
      number: 47,
      reason: 'needs more context',
    });
  });

  it('parses pause command', () => {
    expect(parseCommand('pause covenant-content')).toEqual({
      type: 'pause',
      worker: 'covenant-content',
    });
  });

  it('parses resume command', () => {
    expect(parseCommand('resume covenant-content')).toEqual({
      type: 'resume',
      worker: 'covenant-content',
    });
  });

  it('returns null for unknown input', () => {
    expect(parseCommand('hello world')).toBeNull();
    expect(parseCommand('')).toBeNull();
    expect(parseCommand('do something random')).toBeNull();
  });
});
