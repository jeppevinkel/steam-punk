import { REST, Routes } from 'discord.js';
import type { AppConfig } from '../config.ts';
import type { SlashCommand } from './types.ts';

/** Replaces all global application (/) commands with the given set. */
export async function registerCommands(config: AppConfig, commands: readonly SlashCommand[]): Promise<void> {
    const rest = new REST().setToken(config.discord.token);

    console.log(`Started refreshing ${commands.length} application (/) commands.`);
    const data = await rest.put(
        Routes.applicationCommands(config.discord.clientId),
        { body: commands.map(cmd => cmd.data.toJSON()) },
    ) as unknown[];
    console.log(`Successfully reloaded ${data.length} application (/) commands.`);
}
