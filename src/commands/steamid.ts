import { MessageFlags } from 'discord.js';
import type { ChatInputCommandInteraction, SlashCommandStringOption } from 'discord.js';
import type { BotContext } from '../context.ts';
import { parseSteamId64 } from '../steam/index.ts';
import { jsonBlock } from '../util/format.ts';
import { adminCommand } from './builder.ts';
import type { SlashCommand } from './types.ts';

type Interaction = ChatInputCommandInteraction<'cached'>;

const steamIdOption = (description: string) => (option: SlashCommandStringOption) =>
    option.setName('steamid')
        .setDescription(description)
        .setMinLength(17)
        .setMaxLength(17)
        .setRequired(true);

async function replyEphemeral(interaction: Interaction, content: string): Promise<void> {
    await interaction.reply({ content, flags: MessageFlags.Ephemeral });
}

/** @returns The SteamID64 from the `steamid` option, or `null` after telling the user it's invalid. */
async function readSteamIdOption(interaction: Interaction): Promise<string | null> {
    const steamId = parseSteamId64(interaction.options.getString('steamid', true));
    if (steamId === null) {
        await replyEphemeral(interaction, 'The provided SteamID is invalid.');
    }
    return steamId;
}

const subcommands = {
    async show(interaction: Interaction, { stores }: BotContext) {
        await replyEphemeral(interaction, jsonBlock(stores.settings.get(interaction.guildId).steamIds));
    },

    async add(interaction: Interaction, { stores }: BotContext) {
        const steamId = await readSteamIdOption(interaction);
        if (steamId === null) return;

        await replyEphemeral(interaction, stores.settings.addSteamId(interaction.guildId, steamId)
            ? `\`${steamId}\` has been added to the tracked list.`
            : `\`${steamId}\` is already on the tracked list.`);
    },

    async remove(interaction: Interaction, { stores }: BotContext) {
        const steamId = await readSteamIdOption(interaction);
        if (steamId === null) return;

        if (!stores.settings.removeSteamId(interaction.guildId, steamId)) {
            await replyEphemeral(interaction, 'Couldn\'t remove the id. Are you sure it isn\'t already removed?');
            return;
        }
        // Forget the library so re-adding the account later doesn't announce everything bought in between.
        stores.ownedGames.forget(interaction.guildId, steamId);
        await replyEphemeral(interaction, `\`${steamId}\` removed from the tracked list.`);
    },
} satisfies Record<string, (interaction: Interaction, ctx: BotContext) => Promise<void>>;

function isSubcommand(name: string): name is keyof typeof subcommands {
    return Object.hasOwn(subcommands, name);
}

export const steamIdCommand: SlashCommand = {
    data: adminCommand('steamid', 'Manage the SteamIDs to watch.')
        .addSubcommand(sub => sub.setName('add')
            .setDescription('Add a SteamID to the watch list.')
            .addStringOption(steamIdOption('The SteamID to add.')))
        .addSubcommand(sub => sub.setName('remove')
            .setDescription('Remove a SteamID from the watch list.')
            .addStringOption(steamIdOption('The SteamID to remove.')))
        .addSubcommand(sub => sub.setName('show')
            .setDescription('Show the current list of SteamIDs.')),

    async execute(interaction, ctx) {
        const sub = interaction.options.getSubcommand(true);
        if (!isSubcommand(sub)) {
            throw new Error(`Invalid subcommand: ${sub}`);
        }
        await subcommands[sub](interaction, ctx);
    },
};
