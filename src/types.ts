export interface ExtractedTask {
  title: string;
  body: string;
  repo: string;
  confidence: number;
  urgency: 'now' | 'today' | 'this-week' | 'someday';
  source: {
    author: string;
    channel: string;
    timestamp: string;
  };
  source_message: string;
}

export interface ExtractionResult {
  tasks: ExtractedTask[];
  ignored: string[];
}

export interface RepoRoute {
  repo: string;
  owner: string;
  keywords: string[];
  description: string;
}

export interface WorkerConfig {
  name: string;
  repo: string;
  schedule: string;
  agent: {
    type: string;
    prompt_file: string;
    max_turns?: number;
    allowed_tools?: string[];
  };
  triggers?: string[];
  notifications?: string[];
  auto_merge_eligible?: boolean;
  max_duration?: number;
}

export interface WorkerResult {
  success: boolean;
  prs_opened: string[];
  issues_updated: string[];
  branches_created: string[];
  exit_reason: string;
  summary?: string;
}

export interface AppSettings {
  extraction: {
    confidence_threshold: number;
    batch_window_ms: number;
    max_issues_per_batch: number;
  };
  concurrency: {
    max_concurrent_workers: number;
  };
  digest: {
    interval_ms: number;
  };
}
