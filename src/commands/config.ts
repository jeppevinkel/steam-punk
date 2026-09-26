import { jsonBlock } from '../util/format.ts';
import { adminCommand } from './builder.ts';
import type { SlashCommand } from './types.ts';

export const configCommand: SlashCommand = {
    data: adminCommand('config', 'Show the current config.'),

    async execute(interaction, { stores }) {
        await interaction.reply(jsonBlock(stores.settings.get(interaction.guildId)));
    },
};
