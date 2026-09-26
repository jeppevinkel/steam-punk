import type { Guild } from 'discord.js';
import type { BotContext } from '../context.ts';
import { getSendableChannel } from '../util/channels.ts';
import { checkPurchases } from './purchases.ts';
import { checkRssFeeds } from './rssFeeds.ts';

/** Periodically checks every guild for new purchases and RSS items. */
export class GameChecker {
    readonly #ctx: BotContext;
    #timer: NodeJS.Timeout | undefined;
    #running = false;

    constructor(ctx: BotContext) {
        this.#ctx = ctx;
    }

    start(): void {
        if (this.#timer) return;
        void this.runOnce();
        this.#timer = setInterval(() => void this.runOnce(), this.#ctx.config.checkIntervalMs);
    }

    stop(): void {
        clearInterval(this.#timer);
        this.#timer = undefined;
    }

    async runOnce(): Promise<void> {
        const { client } = this.#ctx;
        if (!client.isReady()) return;
        // A slow check (many accounts or rate limiting) must not overlap with the next one.
        if (this.#running) {
            console.warn('Skipping game check: the previous check is still running.');
            return;
        }

        this.#running = true;
        console.log('Doing the game check thingy...');
        try {
            for (const guild of client.guilds.cache.values()) {
                try {
                    await this.#checkGuild(guild);
                } catch (err) {
                    console.error(`Game check failed for ${guild.name}:`, err);
                }
            }
        } finally {
            this.#running = false;
        }
    }

    async #checkGuild(guild: Guild): Promise<void> {
        const settings = this.#ctx.stores.settings.get(guild.id);

        if (settings.steamIds.length > 0) {
            const channel = getSendableChannel(guild, settings.notificationChannelId);
            await checkPurchases(this.#ctx, guild, settings.steamIds, channel);
        }

        await checkRssFeeds(this.#ctx, guild, settings.rssFeeds);
    }
}
