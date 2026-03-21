import { Client, GatewayIntentBits, Events, type Message } from 'discord.js';
import { MessageBatcher, type BatchedMessage } from './monitor.js';
import { settings } from '../config/settings.js';

export interface BotConfig {
  token: string;
  synapzGuildId: string;
  synapzDropboxChannelId: string;    // #dropbox — forward messages here for extraction
  synapzFeedChannelId: string;       // #agent-feed — digest notifications
  synapzApprovalsChannelId: string;  // #approvals — PR review
  synapzCommandsChannelId: string;   // #commands — bot commands
}

export function createBot(
  config: BotConfig,
  onBatch: (messages: BatchedMessage[]) => void,
) {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  const batcher = new MessageBatcher(settings.extraction.batch_window_ms, onBatch);

  client.on(Events.ClientReady, (readyClient) => {
    console.log(`[bot] Logged in as ${readyClient.user.tag}`);
    console.log(`[bot] Monitoring #dropbox channel: ${config.synapzDropboxChannelId}`);
  });

  client.on(Events.MessageCreate, (message: Message) => {
    // Ignore messages from bots
    if (message.author.bot) return;

    // Only process messages in the dropbox channel on synapz_org
    if (
      message.guildId !== config.synapzGuildId ||
      message.channelId !== config.synapzDropboxChannelId
    ) {
      return;
    }

    batcher.add({
      author: message.member?.displayName ?? message.author.username,
      content: message.content,
      timestamp: message.createdAt.toISOString(),
      channelName: '#dropbox',
    });
  });

  return {
    start(): Promise<string> {
      return client.login(config.token);
    },
    stop(): void {
      batcher.destroy();
      client.destroy();
    },
    getClient(): Client {
      return client;
    },
  };
}
