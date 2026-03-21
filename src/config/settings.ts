import type { AppSettings } from '../types.js';

export const settings: AppSettings = {
  extraction: {
    confidence_threshold: 0.7,
    batch_window_ms: 5 * 60 * 1000,
    max_issues_per_batch: 5,
  },
  concurrency: {
    max_concurrent_workers: 3,
  },
  digest: {
    interval_ms: 2 * 60 * 60 * 1000,
  },
};
