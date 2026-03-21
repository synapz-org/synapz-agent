import { describe, it, expect } from 'vitest';
import { buildExtractionPrompt } from '../../src/extraction/prompt.js';
import { loadRegistry } from '../../src/github/registry.js';

const sampleMessages = [
  {
    author: 'Kurt',
    content: 'can someone upvote our reddit post about Templar subnet?',
    timestamp: '2026-03-21T09:15:00Z',
  },
  {
    author: 'Derek',
    content: 'on it',
    timestamp: '2026-03-21T09:16:00Z',
  },
];

describe('buildExtractionPrompt', () => {
  it('includes message content in the prompt', () => {
    const registry = loadRegistry();
    const prompt = buildExtractionPrompt(sampleMessages, registry);
    expect(prompt).toContain('can someone upvote our reddit post about Templar subnet?');
  });

  it('includes message author in the prompt', () => {
    const registry = loadRegistry();
    const prompt = buildExtractionPrompt(sampleMessages, registry);
    expect(prompt).toContain('Kurt');
    expect(prompt).toContain('Derek');
  });

  it('includes message timestamps in the prompt', () => {
    const registry = loadRegistry();
    const prompt = buildExtractionPrompt(sampleMessages, registry);
    expect(prompt).toContain('2026-03-21T09:15:00Z');
  });

  it('includes available repo names in the prompt', () => {
    const registry = loadRegistry();
    const prompt = buildExtractionPrompt(sampleMessages, registry);
    expect(prompt).toContain('covenant-communications');
    expect(prompt).toContain('whats-tonight');
  });

  it('includes repo descriptions in the prompt', () => {
    const registry = loadRegistry();
    const prompt = buildExtractionPrompt(sampleMessages, registry);
    expect(prompt).toContain('Covenant brand content');
    expect(prompt).toContain("Barry's music website");
  });

  it('requests JSON output with "tasks" field', () => {
    const registry = loadRegistry();
    const prompt = buildExtractionPrompt(sampleMessages, registry);
    expect(prompt).toContain('"tasks"');
  });

  it('requests JSON output with "confidence" field', () => {
    const registry = loadRegistry();
    const prompt = buildExtractionPrompt(sampleMessages, registry);
    expect(prompt).toContain('"confidence"');
  });

  it('requests JSON output with "ignored" field', () => {
    const registry = loadRegistry();
    const prompt = buildExtractionPrompt(sampleMessages, registry);
    expect(prompt).toContain('"ignored"');
  });

  it('instructs Claude to return only valid JSON with no markdown fences', () => {
    const registry = loadRegistry();
    const prompt = buildExtractionPrompt(sampleMessages, registry);
    // Should mention JSON-only output (some variation)
    const lowerPrompt = prompt.toLowerCase();
    expect(lowerPrompt).toContain('json');
    expect(lowerPrompt).toMatch(/no markdown|only valid json|no fences|without markdown/);
  });

  it('instructs Claude to include source_message field', () => {
    const registry = loadRegistry();
    const prompt = buildExtractionPrompt(sampleMessages, registry);
    expect(prompt).toContain('source_message');
  });

  it('works with an empty message array', () => {
    const registry = loadRegistry();
    const prompt = buildExtractionPrompt([], registry);
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(0);
  });
});
