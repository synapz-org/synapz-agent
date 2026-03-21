import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseExtractionResponse, extractTasks } from '../../src/extraction/extractor.js';
import type { ExtractionResult } from '../../src/types.js';

// Mock the Anthropic SDK
const mockCreate = vi.fn();

vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      messages = { create: mockCreate };
      constructor(_opts?: unknown) {}
    },
  };
});

const validTask = {
  title: 'Upvote Templar subnet Reddit post',
  body: 'Kurt asked to amplify the Reddit post about the Templar subnet launch on r/bittensor',
  repo: 'covenant-narrative',
  confidence: 0.85,
  urgency: 'today' as const,
  source: {
    author: 'Kurt',
    channel: 'general',
    timestamp: '2026-03-21T09:15:00Z',
  },
  source_message: 'can someone upvote our reddit post about Templar subnet?',
};

const validJSON = JSON.stringify({
  tasks: [validTask],
  ignored: [],
});

describe('parseExtractionResponse', () => {
  it('parses valid JSON and returns correct tasks', () => {
    const result = parseExtractionResponse(validJSON);
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].title).toBe('Upvote Templar subnet Reddit post');
    expect(result.tasks[0].repo).toBe('covenant-narrative');
    expect(result.tasks[0].confidence).toBe(0.85);
    expect(result.tasks[0].source_message).toBe(
      'can someone upvote our reddit post about Templar subnet?',
    );
  });

  it('returns empty tasks array for invalid JSON', () => {
    const result = parseExtractionResponse('not json');
    expect(result.tasks).toHaveLength(0);
  });

  it('adds "parse_error" to ignored when JSON is invalid', () => {
    const result = parseExtractionResponse('not json');
    expect(result.ignored.some((i) => i.includes('parse_error'))).toBe(true);
  });

  it('strips markdown fences before parsing', () => {
    const fenced = '```json\n' + validJSON + '\n```';
    const result = parseExtractionResponse(fenced);
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].title).toBe('Upvote Templar subnet Reddit post');
  });

  it('strips plain markdown fences (no language tag) before parsing', () => {
    const fenced = '```\n' + validJSON + '\n```';
    const result = parseExtractionResponse(fenced);
    expect(result.tasks).toHaveLength(1);
  });

  it('filters tasks missing required "title" field', () => {
    const missingTitle = JSON.stringify({
      tasks: [{ ...validTask, title: undefined }],
      ignored: [],
    });
    const result = parseExtractionResponse(missingTitle);
    expect(result.tasks).toHaveLength(0);
  });

  it('filters tasks missing required "body" field', () => {
    const missingBody = JSON.stringify({
      tasks: [{ ...validTask, body: undefined }],
      ignored: [],
    });
    const result = parseExtractionResponse(missingBody);
    expect(result.tasks).toHaveLength(0);
  });

  it('filters tasks missing required "repo" field', () => {
    const missingRepo = JSON.stringify({
      tasks: [{ ...validTask, repo: undefined }],
      ignored: [],
    });
    const result = parseExtractionResponse(missingRepo);
    expect(result.tasks).toHaveLength(0);
  });

  it('filters tasks missing required "confidence" field', () => {
    const missingConf = JSON.stringify({
      tasks: [{ ...validTask, confidence: undefined }],
      ignored: [],
    });
    const result = parseExtractionResponse(missingConf);
    expect(result.tasks).toHaveLength(0);
  });

  it('filters tasks missing required "source_message" field', () => {
    const missingSource = JSON.stringify({
      tasks: [{ ...validTask, source_message: undefined }],
      ignored: [],
    });
    const result = parseExtractionResponse(missingSource);
    expect(result.tasks).toHaveLength(0);
  });

  it('preserves valid tasks and drops invalid ones in a mixed batch', () => {
    const mixed = JSON.stringify({
      tasks: [validTask, { title: 'missing fields' }],
      ignored: [],
    });
    const result = parseExtractionResponse(mixed);
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].title).toBe('Upvote Templar subnet Reddit post');
  });

  it('preserves ignored array from response', () => {
    const withIgnored = JSON.stringify({
      tasks: [],
      ignored: ['pure banter detected'],
    });
    const result = parseExtractionResponse(withIgnored);
    expect(result.ignored).toContain('pure banter detected');
  });

  it('handles response with empty tasks array', () => {
    const empty = JSON.stringify({ tasks: [], ignored: ['no actionable tasks'] });
    const result = parseExtractionResponse(empty);
    expect(result.tasks).toHaveLength(0);
    expect(result.ignored).toContain('no actionable tasks');
  });
});

describe('extractTasks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls Claude API and returns parsed tasks', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: validJSON }],
    });

    const messages = [
      {
        author: 'Kurt',
        content: 'upvote our reddit post',
        timestamp: '2026-03-21T09:15:00Z',
      },
    ];

    const result = await extractTasks(messages, 'test-api-key');
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].title).toBe('Upvote Templar subnet Reddit post');
  });

  it('returns empty result when API returns invalid JSON', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'I cannot process that.' }],
    });

    const messages = [
      { author: 'AdamW', content: 'lol emojis are wild', timestamp: '2026-03-21T10:30:00Z' },
    ];

    const result = await extractTasks(messages, 'test-api-key');
    expect(result.tasks).toHaveLength(0);
    expect(result.ignored.some((i) => i.includes('parse_error'))).toBe(true);
  });
});
