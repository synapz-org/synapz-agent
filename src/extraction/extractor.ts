import Anthropic from '@anthropic-ai/sdk';
import type { ExtractedTask, ExtractionResult } from '../types.js';
import { buildExtractionPrompt, type MessageInput } from './prompt.js';
import { loadRegistry } from '../github/registry.js';

const REQUIRED_FIELDS: (keyof ExtractedTask)[] = [
  'title',
  'body',
  'repo',
  'confidence',
  'source_message',
];

function isValidTask(obj: unknown): obj is ExtractedTask {
  if (typeof obj !== 'object' || obj === null) return false;
  const task = obj as Record<string, unknown>;
  return REQUIRED_FIELDS.every((field) => task[field] !== undefined && task[field] !== null);
}

export function parseExtractionResponse(text: string): ExtractionResult {
  // Strip markdown fences if present
  const stripped = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch {
    return {
      tasks: [],
      ignored: ['parse_error: response was not valid JSON'],
    };
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return {
      tasks: [],
      ignored: ['parse_error: response was not a JSON object'],
    };
  }

  const raw = parsed as Record<string, unknown>;
  const rawTasks = Array.isArray(raw.tasks) ? raw.tasks : [];
  const rawIgnored = Array.isArray(raw.ignored)
    ? (raw.ignored as string[])
    : [];

  const validTasks = rawTasks.filter(isValidTask);

  return {
    tasks: validTasks,
    ignored: rawIgnored,
  };
}

export async function extractTasks(
  messages: MessageInput[],
  apiKey: string,
): Promise<ExtractionResult> {
  const registry = loadRegistry();
  const prompt = buildExtractionPrompt(messages, registry);

  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const firstContent = response.content[0];
  const text = firstContent.type === 'text' ? firstContent.text : '';

  return parseExtractionResponse(text);
}
