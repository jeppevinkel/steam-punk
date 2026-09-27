import { jsonBlock } from '../util/format.ts';
import { adminCommand } from './builder.ts';
import type { SlashCommand } from './types.ts';

export const configCommand: SlashCommand = {
    data: adminCommand('config', 'Show the current config.'),

    async execute(interaction, { stores }) {
        // The prefix is left over from the removed text commands and no longer does anything.
        const { prefix: _prefix, ...settings } = stores.settings.get(interaction.guildId);
        await interaction.reply(jsonBlock(settings));
    },
};
