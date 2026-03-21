import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { ExtractedTask, ExtractionResult } from '../types.js';
import { buildExtractionPrompt, type MessageInput } from './prompt.js';
import { loadRegistry } from '../github/registry.js';

const execFileAsync = promisify(execFile);

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
): Promise<ExtractionResult> {
  const registry = loadRegistry();
  const prompt = buildExtractionPrompt(messages, registry);

  try {
    const { stdout } = await execFileAsync('claude', [
      '-p', prompt,
      '--output-format', 'text',
      '--model', 'sonnet',
      '--max-turns', '1',
      '--no-session-persistence',
    ], {
      timeout: 60_000,
    });

    return parseExtractionResponse(stdout);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      tasks: [],
      ignored: [`extraction_error: ${message}`],
    };
  }
}
