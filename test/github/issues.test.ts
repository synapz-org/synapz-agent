import { describe, it, expect } from 'vitest';
import { formatIssueBody, buildIssueLabels } from '../../src/github/issues.js';
import type { ExtractedTask } from '../../src/types.js';

const sampleTask: ExtractedTask = {
  title: 'Draft a tweet about Templar subnet launch',
  body: 'Write a short tweet announcing the Templar subnet going live on Bittensor.',
  repo: 'covenant-narrative',
  confidence: 0.85,
  urgency: 'today',
  source: {
    author: 'Derek Barnes',
    channel: '#marketing',
    timestamp: '2026-03-21T10:00:00Z',
  },
  source_message:
    'Hey can someone draft a tweet about the Templar subnet launch? Need it today.',
};

describe('formatIssueBody', () => {
  it('includes the action description (task body)', () => {
    const body = formatIssueBody(sampleTask);
    expect(body).toContain(sampleTask.body);
  });

  it('includes source attribution (author name and channel)', () => {
    const body = formatIssueBody(sampleTask);
    expect(body).toContain('Derek Barnes');
    expect(body).toContain('#marketing');
  });

  it('includes original message as a blockquote (> prefix)', () => {
    const body = formatIssueBody(sampleTask);
    expect(body).toContain('> Hey can someone draft a tweet');
  });

  it('includes extraction metadata with confidence score', () => {
    const body = formatIssueBody(sampleTask);
    expect(body).toContain('0.85');
    expect(body).toContain('synapz-agent');
  });
});

describe('buildIssueLabels', () => {
  it("returns 'ready' label when confidence >= threshold", () => {
    const labels = buildIssueLabels(sampleTask, 0.7);
    expect(labels).toContain('ready');
    expect(labels).not.toContain('triage');
  });

  it("returns 'triage' label (not 'ready') when confidence < threshold", () => {
    const lowConfTask: ExtractedTask = { ...sampleTask, confidence: 0.5 };
    const labels = buildIssueLabels(lowConfTask, 0.7);
    expect(labels).toContain('triage');
    expect(labels).not.toContain('ready');
  });

  it("includes urgency label 'today' when urgency is 'today'", () => {
    const labels = buildIssueLabels(sampleTask, 0.7);
    expect(labels).toContain('today');
  });

  it("includes urgency label 'now' when urgency is 'now'", () => {
    const nowTask: ExtractedTask = { ...sampleTask, urgency: 'now' };
    const labels = buildIssueLabels(nowTask, 0.7);
    expect(labels).toContain('now');
  });

  it("includes urgency label 'this-week' when urgency is 'this-week'", () => {
    const weekTask: ExtractedTask = { ...sampleTask, urgency: 'this-week' };
    const labels = buildIssueLabels(weekTask, 0.7);
    expect(labels).toContain('this-week');
  });

  it("does not include urgency label when urgency is 'someday'", () => {
    const somedayTask: ExtractedTask = { ...sampleTask, urgency: 'someday' };
    const labels = buildIssueLabels(somedayTask, 0.7);
    expect(labels).not.toContain('someday');
  });
});
