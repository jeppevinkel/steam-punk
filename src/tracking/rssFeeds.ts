import type { Guild } from 'discord.js';
import type { BotContext } from '../context.ts';
import { extractAppId } from '../rss/steamSearchFeed.ts';
import type { RssFeedConfig } from '../storage/index.ts';
import { findSendableChannelByName } from '../util/channels.ts';

async function checkFeed(ctx: BotContext, guild: Guild, feedConfig: RssFeedConfig): Promise<void> {
    const channel = findSendableChannelByName(guild, feedConfig.channel);
    if (!channel) {
        console.warn(`Skipping RSS feed "${feedConfig.title}" in ${guild.name}: channel "${feedConfig.channel}" not found.`);
        return;
    }

    const feed = await ctx.rssParser.parseURL(feedConfig.url);

    for (const { link, title } of feed.items) {
        if (link === undefined || title === undefined) continue;

        // Items are identified by their app ID so the same game isn't posted twice from different feeds.
        const itemId = extractAppId(link) ?? link;
        if (ctx.stores.rssHistory.hasPosted(guild.id, itemId)) continue;

        try {
            await channel.send(`**${title}**\n${link}`);
            ctx.stores.rssHistory.markPosted(guild.id, itemId);
        } catch (err) {
            console.error(`Failed to post RSS item "${title}":`, err);
        }
    }
}

export async function checkRssFeeds(ctx: BotContext, guild: Guild, feeds: readonly RssFeedConfig[]): Promise<void> {
    for (const feed of feeds) {
        try {
            await checkFeed(ctx, guild, feed);
        } catch (err) {
            console.error(`Failed to check RSS feed "${feed.title}" in ${guild.name}:`, err);
        }
    }
}
