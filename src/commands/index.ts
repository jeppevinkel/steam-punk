import { Collection } from 'discord.js';
import { channelCommand } from './channel.ts';
import { configCommand } from './config.ts';
import { steamIdCommand } from './steamid.ts';
import type { SlashCommand } from './types.ts';

export type { SlashCommand } from './types.ts';
export { registerCommands } from './register.ts';

export const commands: readonly SlashCommand[] = [
    configCommand,
    channelCommand,
    steamIdCommand,
];

export const commandsByName = new Collection(commands.map(cmd => [cmd.data.name, cmd]));
