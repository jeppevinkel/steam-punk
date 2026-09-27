import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import RSSParser from 'rss-parser';
import { commands, registerCommands } from './commands/index.ts';
import { loadConfig } from './config.ts';
import type { BotContext } from './context.ts';
import { registerEventHandlers } from './events/index.ts';
import { SteamClient } from './steam/index.ts';
import { createStores } from './storage/index.ts';
import { GameChecker } from './tracking/GameChecker.ts';

const config = loadConfig();

const ctx: BotContext = {
    client: new Client({
        intents: [GatewayIntentBits.Guilds],
    }),
    config,
    stores: createStores(),
    steam: new SteamClient(config.steam.apiKey),
    rssParser: new RSSParser(),
};

const gameChecker = new GameChecker(ctx);
registerEventHandlers(ctx, gameChecker);

function shutdown(signal: NodeJS.Signals): void {
    console.log(`Received ${signal}, shutting down.`);
    gameChecker.stop();
    void ctx.client.destroy().finally(() => process.exit(0));
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

registerCommands(config, commands).catch((err: unknown) => console.error(err));

ctx.client.login(config.discord.token).catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
});
