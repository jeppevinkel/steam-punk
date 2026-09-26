import { InteractionContextType, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';

/** Base builder for the bot's commands: admin-only and only usable inside servers. */
export function adminCommand(name: string, description: string): SlashCommandBuilder {
    return new SlashCommandBuilder()
        .setName(name)
        .setDescription(description)
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setContexts(InteractionContextType.Guild);
}
