import { appendFileSync, readFileSync, existsSync } from 'fs';

export interface FeedbackEntry {
  source_message: string;
  issue_url: string;
  timestamp: string;
}

export function logFalsePositive(logPath: string, entry: FeedbackEntry): void {
  appendFileSync(logPath, JSON.stringify(entry) + '\n', 'utf-8');
}

export function readFeedbackLog(logPath: string): FeedbackEntry[] {
  if (!existsSync(logPath)) {
    return [];
  }

  const contents = readFileSync(logPath, 'utf-8');
  return contents
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as FeedbackEntry);
}
