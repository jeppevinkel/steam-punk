import type { Client } from 'discord.js';
import type RSSParser from 'rss-parser';
import type { AppConfig } from './config.ts';
import type { SteamClient } from './steam/index.ts';
import type { Stores } from './storage/index.ts';

/** Shared services handed to commands, event handlers and background tasks. */
export interface BotContext {
    readonly client: Client;
    readonly config: AppConfig;
    readonly stores: Stores;
    readonly steam: SteamClient;
    readonly rssParser: RSSParser;
}
