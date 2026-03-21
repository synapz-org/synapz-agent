import { describe, it, expect } from 'vitest';
import { loadRegistry, routeTask } from '../../src/github/registry.js';

describe('loadRegistry', () => {
  it('returns routes with repo, owner, and description', () => {
    const registry = loadRegistry();
    expect(registry.length).toBeGreaterThan(0);
    for (const route of registry) {
      expect(route).toHaveProperty('repo');
      expect(route).toHaveProperty('owner');
      expect(route).toHaveProperty('description');
      expect(typeof route.repo).toBe('string');
      expect(typeof route.owner).toBe('string');
      expect(typeof route.description).toBe('string');
    }
  });

  it('finds covenant-narrative route with owner snarktank', () => {
    const registry = loadRegistry();
    const route = registry.find((r) => r.repo === 'covenant-narrative');
    expect(route).toBeDefined();
    expect(route?.owner).toBe('snarktank');
  });
});

describe('routeTask', () => {
  it('routes a tweet task to covenant-narrative', () => {
    const registry = loadRegistry();
    const result = routeTask('Draft a tweet about Templar subnet launch', registry);
    expect(result).not.toBeNull();
    expect(result?.repo).toBe('covenant-narrative');
  });

  it("routes a tour dates task to barry-music-site", () => {
    const registry = loadRegistry();
    const result = routeTask("Update Barry's tour dates page", registry);
    expect(result).not.toBeNull();
    expect(result?.repo).toBe('barry-music-site');
  });

  it('returns null when no keywords match', () => {
    const registry = loadRegistry();
    const result = routeTask('nice weather today', registry);
    expect(result).toBeNull();
  });
});
