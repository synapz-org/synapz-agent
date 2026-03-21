import type { RepoRoute } from '../types.js';

export function loadRegistry(): RepoRoute[] {
  return [
    {
      repo: 'covenant-narrative',
      owner: 'snarktank',
      description: 'Covenant brand content, articles, social posts, and campaign materials',
      keywords: [
        'content',
        'article',
        'tweet',
        'thread',
        'post',
        'templar',
        'basilica',
        'grail',
        'covenant',
        'reddit',
        'linkedin',
        'campaign',
      ],
    },
    {
      repo: 'barry-music-site',
      owner: 'dwbarnes',
      description: 'Barry music artist website — tour dates, bio, releases',
      keywords: ['barry', 'music', 'website', 'site', 'tour'],
    },
    {
      repo: 'crunchdao-synth',
      owner: 'dwbarnes',
      description: 'CrunchDAO synthetic data model, competition submissions, and scoring',
      keywords: ['crunchdao', 'model', 'score', 'competition', 'synth'],
    },
  ];
}

export function routeTask(text: string, registry: RepoRoute[]): RepoRoute | null {
  const lower = text.toLowerCase();

  let bestRoute: RepoRoute | null = null;
  let bestCount = 0;

  for (const route of registry) {
    const hits = route.keywords.filter((kw) => lower.includes(kw)).length;
    if (hits > bestCount) {
      bestCount = hits;
      bestRoute = route;
    }
  }

  return bestRoute;
}
