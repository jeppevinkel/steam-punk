import type { Guild, SendableChannels } from 'discord.js';
import type { BotContext } from '../context.ts';
import type { OwnedGame } from '../steam/index.ts';
import { dealEmbed, purchaseEmbed } from './embeds.ts';

export interface Purchase {
    readonly steamId: string;
    readonly game: OwnedGame;
}

/**
 * Compares the current libraries of the given accounts with what was stored last time and
 * records the difference. The first time an account is seen its library is only stored.
 */
async function findNewPurchases(ctx: BotContext, guildId: string, steamIds: readonly string[]): Promise<Purchase[]> {
    const purchases: Purchase[] = [];

    for (const steamId of steamIds) {
        let games: OwnedGame[] | undefined;
        try {
            games = await ctx.steam.getOwnedGames(steamId);
        } catch (err) {
            console.error(`Failed to fetch the games owned by ${steamId}:`, err);
            continue;
        }
        if (games === undefined) continue;

        const known = ctx.stores.ownedGames.getKnownAppIds(guildId, steamId);
        if (known !== undefined) {
            for (const game of games) {
                if (known.has(game.appid)) continue;
                console.log(`${steamId} has purchased ${game.name}`);
                purchases.push({ steamId, game });
            }
        }

        ctx.stores.ownedGames.setKnownAppIds(guildId, steamId, [...(known ?? []), ...games.map(g => g.appid)]);
    }

    return purchases;
}

async function announcePurchases(ctx: BotContext, channel: SendableChannels, purchases: readonly Purchase[]): Promise<void> {
    const profiles = await ctx.steam.getPlayerSummaries([...new Set(purchases.map(p => p.steamId))])
        .catch((err: unknown) => {
            console.error('Failed to fetch player summaries:', err);
            return [];
        });

    for (const { steamId, game } of purchases) {
        const profile = profiles.find(p => p.steamid === steamId);
        await channel.send({ embeds: [purchaseEmbed(game, profile)] })
            .catch((err: unknown) => console.error(`Failed to announce the purchase of ${game.name}:`, err));
    }
}

async function announceDeals(ctx: BotContext, channel: SendableChannels, purchases: readonly Purchase[]): Promise<void> {
    const prices = await ctx.steam.getPriceOverviews([...new Set(purchases.map(p => p.game.appid))]);

    // The same game may be bought by several tracked accounts, but the deal only needs posting once.
    const announced = new Set<number>();
    for (const { game } of purchases) {
        const price = prices.get(game.appid);
        if (!price || price.discount_percent === 0 || announced.has(game.appid)) continue;
        announced.add(game.appid);

        await channel.send({ embeds: [dealEmbed(game, price)] })
            .catch((err: unknown) => console.error(`Failed to announce the deal on ${game.name}:`, err));
    }
}

export async function checkPurchases(ctx: BotContext, guild: Guild, steamIds: readonly string[], channel: SendableChannels | undefined): Promise<void> {
    const purchases = await findNewPurchases(ctx, guild.id, steamIds);
    if (purchases.length === 0) return;

    if (!channel) {
        console.warn(`Skipping ${purchases.length} purchase(s) in ${guild.name}: no notification channel is set.`);
        return;
    }

    await announcePurchases(ctx, channel, purchases);
    await announceDeals(ctx, channel, purchases)
        .catch((err: unknown) => console.error('Failed to announce deals:', err));
}
