const {Client, Events, GatewayIntentBits, EmbedBuilder} = require('discord.js');
const Enmap = require('enmap');
const SteamID = require('steamid');
const fetch = require('node-fetch');
const rssParser = new (require('rss-parser'))();
const commandManager = require('./commandManager');

const config = require('./config.json');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

commandManager.default(client, config);

const gameFetchApi = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${config.steam.apiKey}&steamid={steamid}&format=json&include_appinfo=true`;
const nameFetchApi = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${config.steam.apiKey}&format=json&steamids={steamids}`;
const gameImgApi = 'https://media.steampowered.com/steamcommunity/public/images/apps/{appid}/{hash}.jpg';
const storeUrl = 'https://store.steampowered.com/app/{appid}/';
const priceInfoApi = 'https://store.steampowered.com/api/appdetails?appids={appids}&filters=price_overview';

const rssFeed = 'https://andreasaronsson.com/!rss/steam_search.php?title=Steam+Co-op+VR+Games&url=https%3A%2F%2Fstore.steampowered.com%2Fsearch%2F%3Fsort_by%3DName_ASC%26category3%3D9%26vrsupport%3D201';

function extractAppId(url) {
    const regex = /app\/(\d+)/;
    const match = regex.exec(url);
    if (match) {
        return match[1];
    }
    return null;
}

function createRssUrl(title, searchUrl) {
    return `https://andreasaronsson.com/!rss/steam_search.php?title=${encodeURIComponent(title)}&url=${encodeURIComponent(searchUrl)}`;
}

function isValidUrl(url) {
    const regex = /^(http|https):\/\/[^ "]+$/;
    return regex.test(url);
}

// (async () => {
//
//     let feed = await rssParser.parseURL(rssFeed);
//     console.log(feed.title);
//
//     feed.items.forEach(item => {
//         console.log('(' + extractAppId(item.link) + ') ' + item.title + ':' + item.link)
//     });
//
// })();

client.settings = new Enmap({
    name: 'settings',
    fetchAll: false,
    autoFetch: true,
    cloneLevel: 'deep',
    autoEnsure: {
        prefix: 'sp!',
        notificationChannelId: '',
        steamIds: [],
        rssFeeds: [],
    },
});

client.steamHash = new Enmap({
    name: 'steamHash',
    autoEnsure: [],
});

client.rssHash = new Enmap({
    name: 'rssHash',
    autoEnsure: {
        appsIds: [],
    },
});

let checkPurchases = setInterval(async () => {
    if (!client.isReady()) return;
    console.log('Doing the game check thingy...');

    for (const guildId of client.settings.indexes) {
        let steamIds = client.settings.get(guildId, 'steamIds');
        let guild = client.guilds.cache.get(guildId);
        let channel = guild.channels.cache.get(client.settings.get(guildId, 'notificationChannelId'));
        console.log(channel);
        let rssFeeds = client.settings.get(guildId, 'rssFeeds');
        if (rssFeeds === undefined) {
            rssFeeds = [];
        }

        let profiles = (await (await fetch(nameFetchApi.replace('{steamids}', steamIds.join(',')), {method: 'Get'})).json()).response.players.map((p) => {
            return {
                steamid: p.steamid,
                personaname: p.personaname,
                avatarmedium: p.avatarmedium,
                profileurl: p.profileurl,
            };
        });

        let purchasesToAnnounce = [];

        for (const steamId of steamIds) {
            let hashId = `${guildId} - ${steamId}`;
            let games = (await (await fetch(gameFetchApi.replace('{steamid}', steamId), {method: 'Get'})).json()).response?.games;
            if (games === undefined) continue;

            if (client.steamHash.get(hashId).length === 0) {
                client.steamHash.set(hashId, games.map(g => g.appid));
            } else {
                for (const game of games) {
                    if (!client.steamHash.includes(hashId, game.appid)) {
                        console.log(steamId + ' has purchased ' + game.name);
                        client.steamHash.push(hashId, game.appid);
                        purchasesToAnnounce.push({
                            steamId: steamId,
                            gameName: game.name,
                            appid: game.appid,
                            img_icon_url: game.img_icon_url,
                            img_logo_url: game.img_logo_url,
                        });
                    }
                }
            }
        }

        for (const purchase of purchasesToAnnounce) {
            let profile = profiles.find(p => p.steamid === purchase.steamId);

            let embed = new EmbedBuilder();
            try {
                embed.setAuthor({
                    name: profile.personaname,
                    iconURL: profile.avatarmedium,
                    url: profile.profileurl,
                });
                embed.setThumbnail(gameImgApi.replace('{appid}', purchase.appid).replace('{hash}', purchase.img_icon_url));
                embed.setImage(gameImgApi.replace('{appid}', purchase.appid).replace('{hash}', purchase.img_logo_url));
                embed.setDescription(`${purchase.gameName} has been added to the library`);
                embed.setURL(storeUrl.replace('{appid}', purchase.appid));
                embed.setTitle(purchase.gameName);
            } catch (err) {
                console.log(err);
            }

            channel.send({embeds: [embed]}).catch(err => {
                console.error(err);
            });
        }

        fetch(priceInfoApi.replace('{appids}', purchasesToAnnounce.map(p => p.appid).join(',')), {method: 'Get'})
            .then(res => res.json())
            .then(prices => {
                for (const purchase of purchasesToAnnounce) {
                    let price = prices[purchase.appid].data.price_overview;
                    if (price === undefined || price.discount_percent === 0) continue;

                    let embed = new EmbedBuilder();
                    try {
                        embed.setAuthor({name: 'STEAM DEALS'});
                        embed.setThumbnail(gameImgApi.replace('{appid}', purchase.appid).replace('{hash}', purchase.img_icon_url));
                        embed.setImage(gameImgApi.replace('{appid}', purchase.appid).replace('{hash}', purchase.img_logo_url));
                        embed.setDescription(`${purchase.gameName} is currently on a ${price.discount_percent}% sale!`);
                        embed.setURL(storeUrl.replace('{appid}', purchase.appid));
                        embed.setTitle(purchase.gameName);
                        embed.addFields({
                            name: 'Normal Price',
                            value: `${price.initial / 100} ${price.currency}`,
                        }, {
                            name: 'Current Price',
                            value: `${price.final / 100} ${price.currency}`,
                        });
                    } catch (err) {
                        console.error(err);
                    }

                    channel.send({embeds: [embed]}).catch(err => {
                        console.error(err);
                    });
                }
            })
            .catch(err => {
                console.error(err);
            });

        for (const rssFeed of rssFeeds) {
            let channel = guild.channels.cache.find(ch => ch.name === rssFeed.channel);
            let feed = await rssParser.parseURL(rssFeed.url);
            let items = feed.items;
            client.rssHash.get(guildId);
            for (const item of items) {
                if (item.link === undefined || item.title === undefined) continue;
                const appId = extractAppId(item.link);
                if (client.rssHash.includes(guildId, appId, 'appsIds')) {
                    console.log(`${item.title} has already been posted`);
                    continue;
                }

                channel.send(`**${item.title}**\n${item.link}`)
                    .then(() => {
                        client.rssHash.push(guildId, appId, 'appsIds');
                    })
                    .catch(err => {
                        console.log(err);
                    });
            }
        }
    }
}, 600000);

client.on(Events.ClientReady, client => {
    console.log('Damn I\'m ready now!\nBtw I\'m in ' + client.guilds.cache.size + ' guilds.');

    for (const guild of client.guilds.cache.values()) {
        const guildConf = client.settings.get(guild.id);

        if (guildConf.notificationChannelId == null) {
            // const currentChannel = guild.channels.cache.get(guildConf.notificationChannel);
            const currentChannel = guild.channels.cache.find(ch => ch.name === guildConf.notificationChannel);
            if (currentChannel === undefined) continue;

            client.settings.set(guild.id, currentChannel.id, 'notificationChannelId');
        }
    }
});

client.on(Events.GuildDelete, guild => {
    client.settings.delete(guild.id);
    console.log(`Left guild: ${guild.name}`);
});

client.on(Events.GuildCreate, guild => {
    console.log(`Joined guild: ${guild.name}`);
});

client.on(Events.MessageCreate, message => {
    if (!message.guild || message.author.bot || (message.guild.ownerId !== message.author.id)) return;

    const guildConf = client.settings.get(message.guild.id);

    if (message.content.indexOf(guildConf.prefix) !== 0) return;

    const args = message.content.split(' ');
    const command = args.shift().slice(guildConf.prefix.length).toLowerCase();
    if (command === 'conf') {
        if (args.length === 0) {
            message.reply('```json\n' + JSON.stringify(guildConf, null, 4) + '\n```');
            return;
        }

        if (args[0] === 'steamid') {
            message.reply('All channel related commands must now be handled through the new slash commands.');
            return;

            if (args.length === 1) {
                message.reply('```json\n' + JSON.stringify(guildConf.steamIds, null, 4) + '\n```');
                return;
            } else if (args[1] === 'add') {
                if (args.length === 2) {
                    message.reply('You must provide a valid steamid to add.');
                    return;
                } else {
                    let sid = new SteamID(args[2]);

                    if (sid.isValid()) {
                        client.settings.push(message.guild.id, sid.getSteamID64(), 'steamIds');
                        message.reply('`' + sid.getSteamID64() + '` has been added to the tracked list.');
                    }
                }
            } else if (args[1] === 'rem') {
                if (args.length === 2) {
                    message.reply('You must provide a valid steamid to remove.');
                    return;
                } else {
                    let sid = new SteamID(args[2]);

                    if (sid.isValid() && client.settings.has(message.guild.id, sid.getSteamID64(), 'steamIds')) {
                        client.settings.remove(message.guild.id, sid.getSteamID64(), 'steamIds');
                        message.reply('`' + sid.getSteamID64() + '` removed from the tracked list.');
                    } else {
                        message.reply('Couldn\'t remove the id. Are you sure it\'s valid and not already removed?');
                    }
                }
            }
        } else if (args[0] === 'channel') {
            message.reply('All channel related commands must now be handled through the new slash commands.');
            return;

            if (args.length === 1) {
                message.reply('```json\n' + JSON.stringify(guildConf.notificationChannel, null, 4) + '\n```');
                return;
            } else if (args[1] === 'set') {
                if (args.length === 2) {
                    message.reply('You must provide a new channel name.');
                    return;
                } else {
                    client.settings.set(message.guild.id, args[2], 'notificationChannel');
                    message.reply(`Purchase notifications will now be sent to \`${args[2]}\`.`);
                }
            }
        } else if (args[0] === 'prefix') {
            if (args.length === 1) {
                message.reply('```json\n' + JSON.stringify(guildConf.prefix, null, 4) + '\n```');
                return;
            } else if (args[1] === 'set') {
                if (args.length === 2) {
                    message.reply('You must provide a new prefix.');
                    return;
                } else {
                    client.settings.set(message.guild.id, args[2], 'prefix');
                    message.reply(`Command prefix has been set to \`${args[2]}\`.`);
                }
            }
        } else if (args[0] === 'rss') {
            if (!client.settings.has(message.guild.id, 'rssFeeds')) {
                client.settings.set(message.guild.id, [], 'rssFeeds');
            }
            if (args.length === 1) {
                message.reply('```json\n' + JSON.stringify(guildConf.rssFeeds, null, 4) + '\n```');
                return;
            } else if (args[1] === 'add') {
                if (args.length < 5) {
                    message.reply('You must provide a url, channel and title for the rss feed.');
                    return;
                } else {
                    const title = args.slice(4, args.length).join(' ');
                    const url = args[2];
                    const channel = args[3];
                    const validChannels = message.guild.channels.cache.map(c => c.name);

                    if (!validChannels.includes(channel)) {
                        message.reply('The channel you provided is not a valid channel.');
                        return;
                    }

                    if (!isValidUrl(url)) {
                        message.reply('The url you provided is not a valid url.');
                        return;
                    }

                    const rssUrl = createRssUrl(title, url);

                    client.settings.push(message.guild.id, {
                        title: title,
                        url: rssUrl,
                        channel: channel,
                    }, 'rssFeeds');
                    message.reply('`' + title + '` has been added to the tracked list.');
                }
            } else if (args[1] === 'rem') {
                if (args.length !== 3) {
                    message.reply('You must provide a valid rss feed (recognized by the rss url) to remove.');
                    return;
                } else {
                    let rss = args[2];

                    let rssFeeds = client.settings.get(message.guild.id, 'rssFeeds');

                    if (rssFeeds.length === 0) {
                        message.reply('There are no rss feeds to remove.');
                        return;
                    }

                    let rssFeed = rssFeeds.find(r => r.url === rss);

                    if (rssFeed) {
                        client.settings.remove(message.guild.id, rssFeed, 'rssFeeds');
                        message.reply('`' + rssFeed.title + '` removed from the tracked list.');
                    } else {
                        message.reply('Couldn\'t remove the rss feed. Are you sure it\'s valid and not already removed?');
                    }
                }
            }
        }
    } else if (command === 'help' || command === 'h') {
        message.reply(`Available commands:
        \`${client.settings.get(message.guild.id, 'prefix')}help\` shows this message.
        \`${client.settings.get(message.guild.id, 'prefix')}conf\` shows current configs.
        \`${client.settings.get(message.guild.id, 'prefix')}conf steamid add <id>\` adds a steamid to track purchases from.
        \`${client.settings.get(message.guild.id, 'prefix')}conf steamid rem <id>\` removes a steamid from the tracked list.
        \`${client.settings.get(message.guild.id, 'prefix')}conf channel set <channel-name>\` sets the channel to post purchases in.
        \`${client.settings.get(message.guild.id, 'prefix')}conf prefix set <command-prefix>\` sets the command prefix.
        \`${client.settings.get(message.guild.id, 'prefix')}conf rss\` lists all rss feeds.
        \`${client.settings.get(message.guild.id, 'prefix')}conf rss add <search-url> <channel-name> <title>\` adds a steam search rss feed.
        \`${client.settings.get(message.guild.id, 'prefix')}conf rss rem <rss-url>\` removes a steam search rss feed.`);
    }
});

client.login(config.discord.token).catch(err => {
    console.log(err);
});
