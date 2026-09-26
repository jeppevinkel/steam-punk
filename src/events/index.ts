import { Events } from 'discord.js';
import type { BotContext } from '../context.ts';
import type { GameChecker } from '../tracking/GameChecker.ts';
import { handleInteraction } from './interactionCreate.ts';
import { handleReady } from './ready.ts';

/** Runs an async event handler, logging instead of crashing on failure. */
function safely<Args extends unknown[]>(handler: (...args: Args) => Promise<unknown>): (...args: Args) => void {
    return (...args) => {
        handler(...args).catch((err: unknown) => console.error(err));
    };
}

export function registerEventHandlers(ctx: BotContext, gameChecker: GameChecker): void {
    const { client, stores } = ctx;

    client.once(Events.ClientReady, readyClient => {
        handleReady(readyClient, ctx);
        gameChecker.start();
    });

    client.on(Events.InteractionCreate, safely(interaction => handleInteraction(interaction, ctx)));

    client.on(Events.GuildCreate, guild => {
        console.log(`Joined guild: ${guild.name}`);
    });

    client.on(Events.GuildDelete, guild => {
        stores.settings.delete(guild.id);
        stores.ownedGames.forgetGuild(guild.id);
        stores.rssHistory.forgetGuild(guild.id);
        console.log(`Left guild: ${guild.name}`);
    });

    client.on(Events.Error, err => console.error(err));

    client.on(Events.ShardDisconnect, ev => {
        console.error(`DC: ${ev.code}`);
    });
}
