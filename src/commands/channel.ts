import { ChannelType, MessageFlags } from 'discord.js';
import { adminCommand } from './builder.ts';
import type { SlashCommand } from './types.ts';

export const channelCommand: SlashCommand = {
    data: adminCommand('channel', 'Manage the channel used to post purchases.')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Set the channel used to post purchases.')
                .setRequired(false)
                .addChannelTypes(ChannelType.GuildText)),

    async execute(interaction, { stores }) {
        const channel = interaction.options.getChannel('channel', false, [ChannelType.GuildText]);

        if (channel !== null) {
            stores.settings.setNotificationChannel(interaction.guildId, channel.id);
            await interaction.reply({
                content: `The new interaction channel has been set to \`${channel.name}\``,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const { notificationChannelId } = stores.settings.get(interaction.guildId);
        const currentChannel = notificationChannelId
            ? interaction.guild.channels.cache.get(notificationChannelId)
            : undefined;

        await interaction.reply({
            content: currentChannel
                ? `The current channel is \`${currentChannel.name}\``
                : 'No notification channel has been set.',
            flags: MessageFlags.Ephemeral,
        });
    },
};
