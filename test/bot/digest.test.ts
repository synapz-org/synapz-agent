import { describe, it, expect } from 'vitest';
import { formatDigest, DigestCollector, type DigestEntry } from '../../src/bot/digest.js';

describe('formatDigest', () => {
  const timestamp = new Date('2026-03-21T09:30:00Z');

  it('shows type indicators and repo names for entries', () => {
    const entries: DigestEntry[] = [
      { type: 'pr_opened', repo: 'covenant-narrative', detail: 'PR #12 opened' },
      { type: 'pr_merged', repo: 'covenant-marketing', detail: 'PR #5 merged' },
      { type: 'issue_created', repo: 'synapz-agent', detail: 'Issue #3 created' },
      { type: 'issue_closed', repo: 'covenant-narrative', detail: 'Issue #9 closed' },
      { type: 'error', repo: 'synapz-agent', detail: 'Workflow failed' },
    ];

    const result = formatDigest(entries, timestamp);

    expect(result).toContain('Agent Digest -- 2026-03-21 09:30');
    expect(result).toContain('[v] covenant-narrative: PR #12 opened');
    expect(result).toContain('[v] covenant-marketing: PR #5 merged');
    expect(result).toContain('[?] synapz-agent: Issue #3 created');
    expect(result).toContain('[v] covenant-narrative: Issue #9 closed');
    expect(result).toContain('[!] synapz-agent: Workflow failed');
  });

  it('shows "No activity since last digest." for empty entries', () => {
    const result = formatDigest([], timestamp);
    expect(result).toContain('No activity since last digest.');
  });

  it('shows workers footer when workers param provided', () => {
    const entries: DigestEntry[] = [
      { type: 'pr_opened', repo: 'covenant-narrative', detail: 'PR #1 opened' },
    ];

    const result = formatDigest(entries, timestamp, { active: 3, max: 5 });

    expect(result).toContain('Workers: 3/5 slots active');
  });

  it('filters worker_status entries from main list and shows footer', () => {
    const entries: DigestEntry[] = [
      { type: 'pr_opened', repo: 'covenant-narrative', detail: 'PR #1 opened' },
      { type: 'worker_status', repo: '', detail: 'some worker status' },
    ];

    const result = formatDigest(entries, timestamp);

    expect(result).not.toContain('some worker status');
  });

  it('shows workers footer from workers param even with no non-worker entries', () => {
    const result = formatDigest([], timestamp, { active: 1, max: 4 });
    expect(result).toContain('Workers: 1/4 slots active');
  });
});

describe('DigestCollector', () => {
  it('add/flush cycle works', () => {
    const collector = new DigestCollector();
    const ts = new Date('2026-03-21T10:00:00Z');

    collector.add({ type: 'pr_opened', repo: 'covenant-narrative', detail: 'PR #7 opened' });
    collector.add({ type: 'issue_created', repo: 'synapz-agent', detail: 'Issue #2 created' });

    expect(collector.pending).toBe(2);

    const result = collector.flush(ts);

    expect(result).toContain('[v] covenant-narrative: PR #7 opened');
    expect(result).toContain('[?] synapz-agent: Issue #2 created');
    expect(collector.pending).toBe(0);
  });

  it('pending count resets after flush', () => {
    const collector = new DigestCollector();
    collector.add({ type: 'error', repo: 'repo', detail: 'oops' });
    expect(collector.pending).toBe(1);
    collector.flush(new Date());
    expect(collector.pending).toBe(0);
  });

  it('flush with workers shows footer', () => {
    const collector = new DigestCollector();
    collector.add({ type: 'pr_merged', repo: 'covenant-marketing', detail: 'PR #3 merged' });
    const result = collector.flush(new Date('2026-03-21T08:00:00Z'), { active: 2, max: 4 });
    expect(result).toContain('Workers: 2/4 slots active');
  });
});
