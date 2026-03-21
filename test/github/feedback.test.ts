import { describe, it, expect } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { logFalsePositive, readFeedbackLog, type FeedbackEntry } from '../../src/github/feedback.js';

describe('logFalsePositive', () => {
  it('appends a valid JSONL entry to the log file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'feedback-test-'));
    const logPath = join(dir, 'feedback.jsonl');

    const entry: FeedbackEntry = {
      source_message: 'This is not a task',
      issue_url: 'https://github.com/org/repo/issues/1',
      timestamp: '2026-03-21T09:00:00Z',
    };

    logFalsePositive(logPath, entry);

    const entries = readFeedbackLog(logPath);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual(entry);

    rmSync(dir, { recursive: true });
  });

  it('appends multiple entries correctly', () => {
    const dir = mkdtempSync(join(tmpdir(), 'feedback-test-'));
    const logPath = join(dir, 'feedback.jsonl');

    const entry1: FeedbackEntry = {
      source_message: 'Message one',
      issue_url: 'https://github.com/org/repo/issues/1',
      timestamp: '2026-03-21T09:00:00Z',
    };
    const entry2: FeedbackEntry = {
      source_message: 'Message two',
      issue_url: 'https://github.com/org/repo/issues/2',
      timestamp: '2026-03-21T09:05:00Z',
    };

    logFalsePositive(logPath, entry1);
    logFalsePositive(logPath, entry2);

    const entries = readFeedbackLog(logPath);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toEqual(entry1);
    expect(entries[1]).toEqual(entry2);

    rmSync(dir, { recursive: true });
  });
});

describe('readFeedbackLog', () => {
  it('reads multiple entries from NDJSON file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'feedback-test-'));
    const logPath = join(dir, 'feedback.jsonl');

    const entries: FeedbackEntry[] = [
      { source_message: 'alpha', issue_url: 'https://github.com/org/repo/issues/10', timestamp: '2026-03-21T10:00:00Z' },
      { source_message: 'beta', issue_url: 'https://github.com/org/repo/issues/11', timestamp: '2026-03-21T10:01:00Z' },
      { source_message: 'gamma', issue_url: 'https://github.com/org/repo/issues/12', timestamp: '2026-03-21T10:02:00Z' },
    ];

    for (const e of entries) {
      logFalsePositive(logPath, e);
    }

    const result = readFeedbackLog(logPath);
    expect(result).toHaveLength(3);
    expect(result).toEqual(entries);

    rmSync(dir, { recursive: true });
  });

  it('returns empty array for nonexistent file', () => {
    const result = readFeedbackLog('/tmp/nonexistent-feedback-log-xyz.jsonl');
    expect(result).toEqual([]);
  });
});
