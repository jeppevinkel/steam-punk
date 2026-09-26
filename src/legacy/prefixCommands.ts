import type { Message } from 'discord.js';
import type { BotContext } from '../context.ts';
import { createRssUrl, isValidUrl } from '../rss/steamSearchFeed.ts';
import type { GuildSettings } from '../storage/index.ts';
import { jsonBlock } from '../util/format.ts';

interface PrefixCommandContext {
    readonly message: Message<true>;
    /** Arguments after the command name. */
    readonly args: readonly string[];
    readonly settings: GuildSettings;
    readonly ctx: BotContext;
}

type PrefixHandler = (command: PrefixCommandContext) => Promise<unknown>;

const SLASH_COMMANDS_NOTICE = 'All channel related commands must now be handled through the new slash commands.';

const confPrefix: PrefixHandler = async ({ message, args, settings, ctx }) => {
    const [, action, newPrefix] = args;
    if (action === undefined) {
        return message.reply(jsonBlock(settings.prefix));
    }
    if (action !== 'set') return;
    if (!newPrefix) {
        return message.reply('You must provide a new prefix.');
    }

    ctx.stores.settings.setPrefix(message.guildId, newPrefix);
    return message.reply(`Command prefix has been set to \`${newPrefix}\`.`);
};

const confRss: PrefixHandler = async ({ message, args, settings, ctx }) => {
    const [, action, ...rest] = args;

    switch (action) {
        case undefined:
            return message.reply(jsonBlock(settings.rssFeeds));

        case 'add': {
            const [url, channel, ...titleWords] = rest;
            if (url === undefined || channel === undefined || titleWords.length === 0) {
                return message.reply('You must provide a url, channel and title for the rss feed.');
            }
            if (!message.guild.channels.cache.some(c => c.name === channel)) {
                return message.reply('The channel you provided is not a valid channel.');
            }
            if (!isValidUrl(url)) {
                return message.reply('The url you provided is not a valid url.');
            }

            const title = titleWords.join(' ');
            const added = ctx.stores.settings.addRssFeed(message.guildId, {
                title,
                url: createRssUrl(title, url),
                channel,
            });
            return message.reply(added
                ? `\`${title}\` has been added to the tracked list.`
                : `\`${title}\` is already on the tracked list.`);
        }

        case 'rem': {
            const [rssUrl] = rest;
            if (rssUrl === undefined || rest.length !== 1) {
                return message.reply('You must provide a valid rss feed (recognized by the rss url) to remove.');
            }
            if (settings.rssFeeds.length === 0) {
                return message.reply('There are no rss feeds to remove.');
            }

            const removed = ctx.stores.settings.removeRssFeed(message.guildId, rssUrl);
            return message.reply(removed
                ? `\`${removed.title}\` removed from the tracked list.`
                : 'Couldn\'t remove the rss feed. Are you sure it\'s valid and not already removed?');
        }
    }
};

const confSections = new Map<string, PrefixHandler>([
    ['steamid', ({ message }) => message.reply(SLASH_COMMANDS_NOTICE)],
    ['channel', ({ message }) => message.reply(SLASH_COMMANDS_NOTICE)],
    ['prefix', confPrefix],
    ['rss', confRss],
]);

const conf: PrefixHandler = async command => {
    const [section] = command.args;
    if (section === undefined) {
        return command.message.reply(jsonBlock(command.settings));
    }
    return confSections.get(section)?.(command);
};

const help: PrefixHandler = async ({ message, settings: { prefix } }) => message.reply([
    'Available commands:',
    `\`${prefix}help\` shows this message.`,
    `\`${prefix}conf\` shows current configs.`,
    `\`${prefix}conf prefix set <command-prefix>\` sets the command prefix.`,
    `\`${prefix}conf rss\` lists all rss feeds.`,
    `\`${prefix}conf rss add <search-url> <channel-name> <title>\` adds a steam search rss feed.`,
    `\`${prefix}conf rss rem <rss-url>\` removes a steam search rss feed.`,
    '`/steamid add|remove|show` manages the SteamIDs to track purchases from.',
    '`/channel [channel]` shows or sets the channel to post purchases in.',
].join('\n'));

const prefixCommands = new Map<string, PrefixHandler>([
    ['conf', conf],
    ['help', help],
    ['h', help],
]);

/** Handles the old text-based commands. Only the server owner may use them. */
export async function handlePrefixCommand(message: Message, ctx: BotContext): Promise<void> {
    if (!message.inGuild() || message.author.bot || message.guild.ownerId !== message.author.id) return;

    const settings = ctx.stores.settings.get(message.guildId);
    if (!message.content.startsWith(settings.prefix)) return;

    const [name = '', ...args] = message.content.slice(settings.prefix.length).trim().split(/\s+/);
    await prefixCommands.get(name.toLowerCase())?.({ message, args, settings, ctx });
}
