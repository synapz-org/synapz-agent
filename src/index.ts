import 'dotenv/config';
import { createBot } from './bot/client.js';
import { extractTasks } from './extraction/extractor.js';
import { loadRegistry, routeTask } from './github/registry.js';
import { createIssue, buildIssueLabels, ensureLabelsExist } from './github/issues.js';
import { DigestCollector, postToChannel } from './bot/digest.js';
import { parseCommand } from './bot/commands.js';
import { settings } from './config/settings.js';
import { Cron } from 'croner';
import type { TextChannel, Message } from 'discord.js';
import type { BatchedMessage } from './bot/monitor.js';

const REQUIRED_ENV_VARS = ['DISCORD_BOT_TOKEN', 'GITHUB_TOKEN'] as const;

function validateEnv(): void {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    console.error('Copy .env.example to .env and fill in the values.');
    process.exit(1);
  }
}

const LABELS_TO_ENSURE = [
  'triage',
  'ready',
  'in-progress',
  'in-review',
  'false-positive',
  'now',
  'today',
  'this-week',
];

async function main(): Promise<void> {
  validateEnv();

  const githubToken = process.env.GITHUB_TOKEN!;
  const discordToken = process.env.DISCORD_BOT_TOKEN!;
  const covenantGuildId = process.env.COVENANT_GUILD_ID ?? '';
  const covenantChannelIds = (process.env.COVENANT_CHANNEL_IDS ?? '').split(',').filter(Boolean);
  const synapzGuildId = process.env.SYNAPZ_GUILD_ID ?? '';
  const synapzFeedChannelId = process.env.SYNAPZ_FEED_CHANNEL_ID ?? '';
  const synapzApprovalsChannelId = process.env.SYNAPZ_APPROVALS_CHANNEL_ID ?? '';
  const synapzCommandsChannelId = process.env.SYNAPZ_COMMANDS_CHANNEL_ID ?? '';

  console.log('[synapz] Starting up...');

  // Load registry
  const registry = loadRegistry();
  console.log(`[synapz] Loaded ${registry.length} repo routes`);

  // Ensure labels exist on all repos
  console.log('[synapz] Ensuring GitHub labels exist...');
  for (const route of registry) {
    try {
      await ensureLabelsExist(route.owner, route.repo, LABELS_TO_ENSURE, githubToken);
      console.log(`[synapz] Labels ensured for ${route.owner}/${route.repo}`);
    } catch (err) {
      console.warn(`[synapz] Failed to ensure labels for ${route.owner}/${route.repo}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Create digest collector
  const digest = new DigestCollector();

  // Define handleBatch — called when the message batcher flushes
  async function handleBatch(messages: BatchedMessage[]): Promise<void> {
    console.log(`[synapz] Processing batch of ${messages.length} messages`);

    const messageInputs = messages.map((m) => ({
      author: m.author,
      content: m.content,
      timestamp: m.timestamp,
      channelName: m.channelName,
    }));

    const result = await extractTasks(messageInputs);
    console.log(`[synapz] Extracted ${result.tasks.length} tasks, ignored ${result.ignored.length}`);

    const maxIssues = settings.extraction.max_issues_per_batch;
    const tasksToProcess = result.tasks.slice(0, maxIssues);

    if (result.tasks.length > maxIssues) {
      console.warn(
        `[synapz] Batch capped: extracted ${result.tasks.length} tasks, processing only ${maxIssues}`,
      );
    }

    for (const task of tasksToProcess) {
      const route = routeTask(task.title + ' ' + task.body, registry);

      if (!route) {
        console.warn(`[synapz] No route found for task: ${task.title}`);
        digest.add({
          type: 'error',
          repo: task.repo,
          detail: `No route found for: ${task.title}`,
        });
        continue;
      }

      const labels = buildIssueLabels(task, settings.extraction.confidence_threshold);

      try {
        const issue = await createIssue(task, route.owner, route.repo, labels, githubToken);
        console.log(`[synapz] Created issue #${issue.number} on ${route.owner}/${route.repo}: ${issue.url}`);
        digest.add({
          type: 'issue_created',
          repo: `${route.owner}/${route.repo}`,
          detail: `#${issue.number} ${task.title} — ${issue.url}`,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[synapz] Failed to create issue for "${task.title}": ${message}`);
        digest.add({
          type: 'error',
          repo: `${route.owner}/${route.repo}`,
          detail: `Failed to create issue "${task.title}": ${message}`,
        });
      }
    }
  }

  // Create and start the Discord bot
  const bot = createBot(
    {
      token: discordToken,
      covenantGuildId,
      covenantChannelIds,
      synapzGuildId,
      synapzFeedChannelId,
      synapzApprovalsChannelId,
      synapzCommandsChannelId,
    },
    handleBatch,
  );

  // Command handler on synapz_org server
  const client = bot.getClient();
  client.on('messageCreate', async (message: Message) => {
    // Ignore bots
    if (message.author.bot) return;

    // Only respond in the commands channel on the synapz guild
    if (
      message.guildId !== synapzGuildId ||
      message.channelId !== synapzCommandsChannelId
    ) {
      return;
    }

    const command = parseCommand(message.content);
    if (!command) return;

    switch (command.type) {
      case 'status': {
        const repoInfo = command.repo ? ` (repo: ${command.repo})` : '';
        await message.reply(
          `Synapz Agent is running${repoInfo}. Monitoring ${registry.length} repos. Digest has ${digest.pending} pending entries.`,
        );
        break;
      }

      case 'task': {
        // Find route by exact repo name match or keyword routing
        const route =
          registry.find((r) => r.repo === command.repo) ??
          routeTask(command.description, registry);

        if (!route) {
          await message.reply(`No route found for repo "${command.repo}". Available: ${registry.map((r) => r.repo).join(', ')}`);
          break;
        }

        try {
          const task = {
            title: command.description,
            body: command.description,
            repo: route.repo,
            confidence: 1.0,
            urgency: 'today' as const,
            source: {
              author: message.member?.displayName ?? message.author.username,
              channel: message.channelId,
              timestamp: message.createdAt.toISOString(),
            },
            source_message: message.content,
          };
          const labels = buildIssueLabels(task, settings.extraction.confidence_threshold);
          const issue = await createIssue(task, route.owner, route.repo, labels, githubToken);
          await message.reply(`Created issue #${issue.number}: ${issue.url}`);
          digest.add({
            type: 'issue_created',
            repo: `${route.owner}/${route.repo}`,
            detail: `#${issue.number} ${command.description} — ${issue.url}`,
          });
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          await message.reply(`Failed to create issue: ${errMsg}`);
        }
        break;
      }

      default: {
        await message.reply('Coming in Phase 2');
        break;
      }
    }
  });

  // Start the bot
  await bot.start();
  console.log('[synapz] Bot started');

  // Cron digest schedule — every 2 hours
  new Cron('0 */2 * * *', async () => {
    if (digest.pending === 0) {
      console.log('[digest] No pending entries, skipping digest post');
      return;
    }

    const feedChannel = client.channels.cache.get(synapzFeedChannelId) as TextChannel | undefined;
    if (!feedChannel) {
      console.warn('[digest] Feed channel not found in cache, skipping digest');
      return;
    }

    const content = digest.flush(new Date());
    try {
      await postToChannel(feedChannel, content);
      console.log('[digest] Posted digest to feed channel');
    } catch (err) {
      console.error(`[digest] Failed to post digest: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  console.log('[synapz] Cron digest scheduled (every 2 hours)');

  // Graceful shutdown
  const shutdown = (): void => {
    console.log('[synapz] Shutting down...');
    bot.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('[synapz] Fatal error:', err);
  process.exit(1);
});
