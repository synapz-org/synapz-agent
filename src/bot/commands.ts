export type Command =
  | { type: 'status'; repo?: string }
  | { type: 'task'; repo: string; description: string }
  | { type: 'approve'; repo: string; number: number }
  | { type: 'reject'; repo: string; number: number; reason: string }
  | { type: 'pause'; worker: string }
  | { type: 'resume'; worker: string };

export function parseCommand(text: string): Command | null {
  const trimmed = text.trim();

  // status [repo]
  const statusMatch = trimmed.match(/^status(?:\s+(\S+))?$/);
  if (statusMatch) {
    return statusMatch[1]
      ? { type: 'status', repo: statusMatch[1] }
      : { type: 'status' };
  }

  // task <repo>: <description>
  const taskMatch = trimmed.match(/^task\s+([^:]+):\s+(.+)$/);
  if (taskMatch) {
    return { type: 'task', repo: taskMatch[1].trim(), description: taskMatch[2].trim() };
  }

  // approve PR <repo>#<number>
  const approveMatch = trimmed.match(/^approve\s+PR\s+([^#]+)#(\d+)$/);
  if (approveMatch) {
    return { type: 'approve', repo: approveMatch[1].trim(), number: parseInt(approveMatch[2], 10) };
  }

  // reject PR <repo>#<number> <reason>
  const rejectMatch = trimmed.match(/^reject\s+PR\s+([^#]+)#(\d+)\s+(.+)$/);
  if (rejectMatch) {
    return {
      type: 'reject',
      repo: rejectMatch[1].trim(),
      number: parseInt(rejectMatch[2], 10),
      reason: rejectMatch[3].trim(),
    };
  }

  // pause <worker>
  const pauseMatch = trimmed.match(/^pause\s+(\S+)$/);
  if (pauseMatch) {
    return { type: 'pause', worker: pauseMatch[1] };
  }

  // resume <worker>
  const resumeMatch = trimmed.match(/^resume\s+(\S+)$/);
  if (resumeMatch) {
    return { type: 'resume', worker: resumeMatch[1] };
  }

  return null;
}
