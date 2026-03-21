import type { TextChannel } from 'discord.js';

export interface DigestEntry {
  type: 'pr_opened' | 'pr_merged' | 'issue_created' | 'issue_closed' | 'worker_status' | 'error';
  repo: string;
  detail: string;
}

function indicator(type: DigestEntry['type']): string {
  switch (type) {
    case 'pr_opened':
    case 'pr_merged':
    case 'issue_closed':
      return '[v]';
    case 'issue_created':
      return '[?]';
    case 'error':
      return '[!]';
    case 'worker_status':
      return '  ';
  }
}

function padTwo(n: number): string {
  return n.toString().padStart(2, '0');
}

function formatTimestamp(date: Date): string {
  const yyyy = date.getUTCFullYear();
  const mm = padTwo(date.getUTCMonth() + 1);
  const dd = padTwo(date.getUTCDate());
  const hh = padTwo(date.getUTCHours());
  const min = padTwo(date.getUTCMinutes());
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

export function formatDigest(
  entries: DigestEntry[],
  timestamp: Date,
  workers?: { active: number; max: number },
): string {
  const mainEntries = entries.filter((e) => e.type !== 'worker_status');

  const lines: string[] = [`Agent Digest -- ${formatTimestamp(timestamp)}`, '----'];

  if (mainEntries.length === 0) {
    lines.push('No activity since last digest.');
  } else {
    for (const entry of mainEntries) {
      lines.push(`${indicator(entry.type)} ${entry.repo}: ${entry.detail}`);
    }
  }

  if (workers !== undefined) {
    lines.push('');
    lines.push(`Workers: ${workers.active}/${workers.max} slots active`);
  }

  return lines.join('\n');
}

export class DigestCollector {
  private entries: DigestEntry[] = [];

  add(entry: DigestEntry): void {
    this.entries.push(entry);
  }

  flush(timestamp: Date, workers?: { active: number; max: number }): string {
    const result = formatDigest(this.entries, timestamp, workers);
    this.entries = [];
    return result;
  }

  get pending(): number {
    return this.entries.length;
  }
}

export async function postToChannel(channel: TextChannel, content: string): Promise<void> {
  if (content.length <= 2000) {
    await channel.send(content);
    return;
  }

  const lines = content.split('\n');
  let chunk = '';

  for (const line of lines) {
    const addition = chunk.length === 0 ? line : `\n${line}`;
    if (chunk.length + addition.length > 2000) {
      await channel.send(chunk);
      chunk = line;
    } else {
      chunk += addition;
    }
  }

  if (chunk.length > 0) {
    await channel.send(chunk);
  }
}
