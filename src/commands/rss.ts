import { ChannelType, MessageFlags } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { BotContext } from '../context.ts';
import { createRssUrl, isValidUrl } from '../rss/steamSearchFeed.ts';
import { jsonBlock } from '../util/format.ts';
import { adminCommand } from './builder.ts';
import type { SlashCommand } from './types.ts';

type Interaction = ChatInputCommandInteraction<'cached'>;

/** Autocomplete choices are capped by Discord. */
const MAX_CHOICES = 25;

async function replyEphemeral(interaction: Interaction, content: string): Promise<void> {
    await interaction.reply({ content, flags: MessageFlags.Ephemeral });
}

const subcommands = {
    async show(interaction: Interaction, { stores }: BotContext) {
        await replyEphemeral(interaction, jsonBlock(stores.settings.get(interaction.guildId).rssFeeds));
    },

    async add(interaction: Interaction, { stores }: BotContext) {
        const searchUrl = interaction.options.getString('url', true);
        const channel = interaction.options.getChannel('channel', true, [ChannelType.GuildText]);
        const title = interaction.options.getString('title', true);

        if (!isValidUrl(searchUrl)) {
            await replyEphemeral(interaction, 'The url you provided is not a valid url.');
            return;
        }

        const added = stores.settings.addRssFeed(interaction.guildId, {
            title,
            url: createRssUrl(title, searchUrl),
            channelId: channel.id,
        });
        await replyEphemeral(interaction, added
            ? `\`${title}\` has been added to the tracked list and will be posted in \`${channel.name}\`.`
            : `\`${title}\` is already on the tracked list.`);
    },

    async remove(interaction: Interaction, { stores }: BotContext) {
        const feed = interaction.options.getString('feed', true);
        const removed = stores.settings.removeRssFeed(interaction.guildId, feed);
        await replyEphemeral(interaction, removed
            ? `\`${removed.title}\` removed from the tracked list.`
            : 'Couldn\'t remove the rss feed. Are you sure it exists and isn\'t already removed?');
    },
} satisfies Record<string, (interaction: Interaction, ctx: BotContext) => Promise<void>>;

function isSubcommand(name: string): name is keyof typeof subcommands {
    return Object.hasOwn(subcommands, name);
}

export const rssCommand: SlashCommand = {
    data: adminCommand('rss', 'Manage the Steam search RSS feeds.')
        .addSubcommand(sub => sub.setName('add')
            .setDescription('Add a Steam search RSS feed.')
            .addStringOption(option => option.setName('url')
                .setDescription('The Steam store search url.')
                .setRequired(true))
            .addChannelOption(option => option.setName('channel')
                .setDescription('The channel to post new items in.')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText))
            .addStringOption(option => option.setName('title')
                .setDescription('A name for the feed.')
                .setMaxLength(100)
                .setRequired(true)))
        .addSubcommand(sub => sub.setName('remove')
            .setDescription('Remove a Steam search RSS feed.')
            .addStringOption(option => option.setName('feed')
                .setDescription('The feed to remove.')
                .setAutocomplete(true)
                .setRequired(true)))
        .addSubcommand(sub => sub.setName('show')
            .setDescription('Show the current list of RSS feeds.')),

    async execute(interaction, ctx) {
        const sub = interaction.options.getSubcommand(true);
        if (!isSubcommand(sub)) {
            throw new Error(`Invalid subcommand: ${sub}`);
        }
        await subcommands[sub](interaction, ctx);
    },

    async autocomplete(interaction, { stores }) {
        const query = interaction.options.getFocused().toLowerCase();
        const choices = stores.settings.get(interaction.guildId).rssFeeds
            .filter(feed => feed.title.toLowerCase().includes(query))
            .slice(0, MAX_CHOICES)
            // Choice names and values are limited to 100 characters, which new titles are capped at.
            .map(feed => ({ name: feed.title.slice(0, 100), value: feed.title.slice(0, 100) }));
        await interaction.respond(choices);
    },
};
