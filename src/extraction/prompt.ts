import type { RepoRoute } from '../types.js';

export interface MessageInput {
  author: string;
  content: string;
  timestamp: string;
}

export function buildExtractionPrompt(messages: MessageInput[], registry: RepoRoute[]): string {
  const repoList = registry
    .map(
      (r) =>
        `- **${r.repo}** (${r.owner}): ${r.description}\n  Keywords: ${r.keywords.join(', ')}`,
    )
    .join('\n');

  const messageBlock =
    messages.length === 0
      ? '(no messages)'
      : messages
          .map((m) => `[${m.timestamp}] ${m.author}: ${m.content}`)
          .join('\n');

  return `You are a task extraction assistant. Your job is to read a batch of Discord chat messages and identify any actionable tasks that should be tracked as GitHub issues.

## Available Repositories

${repoList}

## Chat Messages

${messageBlock}

## Instructions

Analyze the messages above and extract any actionable tasks. For each task, determine:
- Which repository it belongs to (must be one of the repos listed above)
- A clear, concise title
- A detailed body describing what needs to be done
- The confidence level (0.0–1.0) that this is a genuine task vs casual conversation
- The urgency: "now", "today", "this-week", or "someday"
- The exact message that triggered the task (source_message)

Ignore pure banter, jokes, emoji reactions, and messages with no actionable intent.

## Output Format

Return ONLY valid JSON — no markdown fences, no extra text. Use this exact structure:

{
  "tasks": [
    {
      "title": "Short task title",
      "body": "Full description of what needs to be done and any relevant context",
      "repo": "repo-name-from-list-above",
      "confidence": 0.85,
      "urgency": "today",
      "source": {
        "author": "AuthorName",
        "channel": "channel-name",
        "timestamp": "ISO timestamp"
      },
      "source_message": "The exact message text that triggered this task"
    }
  ],
  "ignored": [
    "Brief reason why each message batch was ignored (if applicable)"
  ]
}

If there are no actionable tasks, return { "tasks": [], "ignored": ["reason"] }.`;
}
