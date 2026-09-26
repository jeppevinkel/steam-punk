import { MessageFlags } from 'discord.js';
import type { Interaction } from 'discord.js';
import { commandsByName } from '../commands/index.ts';
import type { BotContext } from '../context.ts';

const ERROR_REPLY = { content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral } as const;

export async function handleInteraction(interaction: Interaction, ctx: BotContext): Promise<void> {
    if (!interaction.isChatInputCommand()) return;

    const command = commandsByName.get(interaction.commandName);
    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    if (!interaction.inCachedGuild()) {
        await interaction.reply({ content: 'This command can only be used inside a server.', flags: MessageFlags.Ephemeral });
        return;
    }

    try {
        await command.execute(interaction, ctx);
    } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(ERROR_REPLY);
        } else {
            await interaction.reply(ERROR_REPLY);
        }
    }
}
