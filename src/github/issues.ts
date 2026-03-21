import { Octokit } from '@octokit/rest';
import type { ExtractedTask } from '../types.js';

export function formatIssueBody(task: ExtractedTask): string {
  const { body, source, source_message, confidence, urgency } = task;

  const blockquote = source_message
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n');

  return [
    '## Action',
    '',
    body,
    '',
    '## Source',
    '',
    `**Author:** ${source.author}`,
    `**Channel:** ${source.channel}`,
    `**Timestamp:** ${source.timestamp}`,
    '',
    blockquote,
    '',
    '---',
    `Extracted by synapz-agent | Confidence: ${confidence} | Urgency: ${urgency}`,
  ].join('\n');
}

export function buildIssueLabels(
  task: ExtractedTask,
  confidenceThreshold: number
): string[] {
  const labels: string[] = [];

  if (task.confidence >= confidenceThreshold) {
    labels.push('ready');
  } else {
    labels.push('triage');
  }

  if (task.urgency !== 'someday') {
    labels.push(task.urgency);
  }

  return labels;
}

export async function createIssue(
  task: ExtractedTask,
  owner: string,
  repo: string,
  labels: string[],
  token: string
): Promise<{ number: number; url: string }> {
  const octokit = new Octokit({ auth: token });

  const response = await octokit.rest.issues.create({
    owner,
    repo,
    title: task.title,
    body: formatIssueBody(task),
    labels,
  });

  return {
    number: response.data.number,
    url: response.data.html_url,
  };
}

const LABEL_COLORS: Record<string, string> = {
  triage: 'fbca04',
  ready: '0e8a16',
  'in-progress': '1d76db',
  'in-review': 'd93f0b',
  blocked: 'b60205',
  'false-positive': 'e4e669',
  now: 'b60205',
  today: 'd93f0b',
  'this-week': 'fbca04',
};

export async function ensureLabelsExist(
  owner: string,
  repo: string,
  labelNames: string[],
  token: string
): Promise<void> {
  const octokit = new Octokit({ auth: token });

  for (const name of labelNames) {
    try {
      await octokit.rest.issues.getLabel({ owner, repo, name });
    } catch {
      const color = LABEL_COLORS[name] ?? 'ededed';
      await octokit.rest.issues.createLabel({ owner, repo, name, color });
    }
  }
}
