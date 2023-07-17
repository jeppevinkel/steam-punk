const {SlashCommandBuilder, Events, PermissionFlagsBits, REST, Routes, Collection, ChannelType} = require('discord.js');
const SteamID = require('steamid');


exports.default = function (client, config) {
    const rest = new REST().setToken(config.discord.token);
    client.commands = new Collection();

    (async () => {
        try {
            console.log(`Started refreshing ${commands.length} application (/) commands.`);

            // The put method is used to fully refresh all commands in the guild with the current set
            const data = await rest.put(
                Routes.applicationCommands(config.discord.clientId),
                {body: commands.map(cmd => cmd.data.toJSON())},
            );

            console.log(`Successfully reloaded ${data.length} application (/) commands.`);
        } catch (error) {
            // And of course, make sure you catch and log any errors!
            console.error(error);
        }
    })();

    for (const command of commands) {
        // Set a new item in the Collection with the key as the command name and the value as the exported module
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        } else {
            console.log(`[WARNING] The command, ${command}, is missing a required "data" or "execute" property.`);
        }
    }

    client.on(Events.InteractionCreate, async (interaction) => {
        if (!interaction.isChatInputCommand()) return;

        const command = interaction.client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }

        try {
            await command.execute(client, interaction);
        } catch (error) {
            console.error(error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: 'There was an error while executing this command!',
                    ephemeral: true,
                });
            } else {
                await interaction.reply({content: 'There was an error while executing this command!', ephemeral: true});
            }
        }

        // const command = interaction.commandName;
        // const sub = interaction.options.getSubcommand();
        // const group = interaction.options.getSubcommandGroup();
        //
        // console.log({sub, group});
        //
        // switch (sub) {
        //     case 'show':
        //         handleShow(interaction);
        //         break;
        //     default:
        //         console.error(`Unhandled subcommand: ${sub}`);
        // }
    });
};


const commands = [
    // {
    //     data: new SlashCommandBuilder()
    //         .setName('conf')
    //         .setDescription('Manage the configuration of the bot.')
    //         .addSubcommandGroup(group =>
    //             group.setName('steamid')
    //                 .setDescription('Config related to Steam IDs')
    //                 .addSubcommand(command =>
    //                     command.setName('add')
    //                         .setDescription('Add a Steam ID to track purchases from.')
    //                         .addStringOption(option =>
    //                             option.setName('steamid')
    //                                 .setDescription('The Steam ID to add.')
    //                                 .setRequired(true)))
    //                 .addSubcommand(command =>
    //                     command.setName('remove')
    //                         .setDescription('Remove a Steam ID from the tracked list.')
    //                         .addStringOption(option =>
    //                             option.setName('steamid')
    //                                 .setDescription('The Steam ID to remove.')
    //                                 .setRequired(true))))
    //         .addSubcommandGroup(group =>
    //             group.setName('channel')
    //                 .setDescription('Config related to the channel.')
    //                 .addSubcommand(command =>
    //                     command.setName('set')
    //                         .setDescription('Set the channel to post purchases in.')
    //                         .addChannelOption(option =>
    //                             option.setName('channel')
    //                                 .setDescription('The channel to post purchases in.')
    //                                 .setRequired(true))))
    //         .addSubcommand(command =>
    //             command.setName('show')
    //                 .setDescription('Show the current config.'))
    //         .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    //     async execute(interaction) {
    //
    //     },
    // },
    {
        data: new SlashCommandBuilder()
            .setName('config')
            .setDescription('Show the current config.')
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
        async execute(client, interaction) {
            const guildConf = client.settings.get(interaction.guild.id);

            await interaction.reply('```json\n' + JSON.stringify(guildConf, null, 4) + '\n```');
        },
    },
    {
        data: new SlashCommandBuilder()
            .setName('channel')
            .setDescription('Manage the channel used to post purchases.')
            .addChannelOption(option =>
                option.setName('channel')
                    .setDescription('Set the channel used to post purchases.')
                    .setRequired(false)
                    .addChannelTypes(ChannelType.GuildText))
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
        async execute(client, interaction) {
            const guildConf = client.settings.get(interaction.guild.id);
            const channel = interaction.options.getChannel('channel', false, [ChannelType.GuildText]);

            if (channel !== null) {
                client.settings.set(interaction.guild.id, channel.id, 'notificationChannelId');

                interaction.reply({
                    content: `The new interaction channel has been set to \`${channel.name}\``,
                    ephemeral: true,
                });
                return;
            }

            const currentChannel = interaction.guild.channels.cache.get(guildConf.notificationChannelId);

            interaction.reply({
                content: `The current channel is \`${currentChannel.name}\``,
                ephemeral: true,
            });
        },
    },
    {
        data: new SlashCommandBuilder()
            .setName('steamid')
            .setDescription('Manage the SteamIDs to watch.')
            .addSubcommand(subCommand =>
                subCommand.setName('add')
                    .setDescription('Add a SteamID to the watch list.')
                    .addStringOption(option =>
                        option.setName('steamid')
                            .setDescription('The SteamID to add.')
                            .setMinLength(17)
                            .setMaxLength(17)
                            .setRequired(true)))
            .addSubcommand(subCommand =>
                subCommand.setName('remove')
                    .setDescription('Remove a SteamID from the watch list.')
                    .addStringOption(option =>
                        option.setName('steamid')
                            .setDescription('The SteamID to remove.')
                            .setMinLength(17)
                            .setMaxLength(17)
                            .setRequired(true)))
            .addSubcommand(subCommand =>
                subCommand.setName('show')
                    .setDescription('Show the current list of SteamIDs.'))
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
        async execute(client, interaction) {
            const guildConf = client.settings.get(interaction.guild.id);
            const sub = interaction.options.getSubcommand(true);

            if (sub === 'show') {
                interaction.reply({
                    content: '```json\n' + JSON.stringify(guildConf.steamIds, null, 4) + '\n```',
                    ephemeral: true,
                });
                return;
            }

            const steamid = interaction.options.getString('steamid', true);
            const sid = new SteamID(steamid);

            if (!sid.isValid()) {
                interaction.reply({
                    content: 'The provided SteamID is invalid.',
                    ephemeral: true,
                });
                return;
            }

            switch (sub) {
                case 'add':
                    client.settings.push(interaction.guild.id, sid.getSteamID64(), 'steamIds');
                    interaction.reply({
                        content: `\`${sid.getSteamID64()}\` has been added to the tracked list.`,
                        ephemeral: true,
                    });
                    break;
                case 'remove':
                    if (client.settings.includes(interaction.guild.id, sid.getSteamID64(), 'steamIds')) {
                        client.settings.remove(interaction.guild.id, sid.getSteamID64(), 'steamIds');
                        interaction.reply({
                            content: `\`${sid.getSteamID64()}\` removed from the tracked list.`,
                            ephemeral: true,
                        });
                    } else {
                        interaction.reply({
                            content: 'Couldn\'t remove the id. Are you sure it isn\'t already removed?',
                            ephemeral: true,
                        });
                    }
                    break;
                default:
                    throw 'Invalid subcommand';
            }
        },
    },
];