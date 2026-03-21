import { Client, GatewayIntentBits, Events, type Message } from 'discord.js';
import { MessageBatcher, type BatchedMessage } from './monitor.js';
import { settings } from '../config/settings.js';

export interface BotConfig {
  token: string;
  covenantGuildId: string;
  covenantChannelIds: string[];
  synapzGuildId: string;
  synapzFeedChannelId: string;
  synapzApprovalsChannelId: string;
  synapzCommandsChannelId: string;
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
    console.log(`[bot] Monitoring channels: ${config.covenantChannelIds.join(', ')}`);
  });

  client.on(Events.MessageCreate, (message: Message) => {
    // Ignore messages from bots
    if (message.author.bot) return;

    // Only process messages from the covenant guild in monitored channels
    if (
      message.guildId !== config.covenantGuildId ||
      !config.covenantChannelIds.includes(message.channelId)
    ) {
      return;
    }

    const channelName =
      message.channel && 'name' in message.channel
        ? `#${message.channel.name}`
        : message.channelId;

    batcher.add({
      author: message.member?.displayName ?? message.author.username,
      content: message.content,
      timestamp: message.createdAt.toISOString(),
      channelName,
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
