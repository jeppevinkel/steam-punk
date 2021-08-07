const Discord = require("discord.js");
const Enmap = require("enmap");
const SteamID = require("steamid");
const fetch = require('node-fetch');

const config = require("./config.json");

const client = new Discord.Client({
    intents: [Discord.Intents.FLAGS.GUILD_MESSAGES, Discord.Intents.FLAGS.GUILDS]
});

const gameFetchApi = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${config.steam.apiKey}&steamid={steamid}&format=json&include_appinfo=true`;
const nameFetchApi = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${config.steam.apiKey}&format=json&steamids={steamids}`;
const gameImgApi = "https://media.steampowered.com/steamcommunity/public/images/apps/{appid}/{hash}.jpg";
const storeUrl = "https://store.steampowered.com/app/{appid}/";

client.settings = new Enmap({
    name: "settings",
    fetchAll: false,
    autoFetch: true,
    cloneLevel: "deep",
    autoEnsure: {
        prefix: "sp!",
        notificationChannel: "steam-purchases",
        steamIds: [],
    }
});

client.steamHash = new Enmap({
    name: "steamHash",
    autoEnsure: []
});

let checkPurchases = setInterval(async () => {
    if (!client.isReady()) return;
    console.log("Doing the game check thingy...");

    for (const guildId of client.settings.indexes) {
        let steamIds = client.settings.get(guildId, "steamIds");
        let guild = client.guilds.cache.get(guildId);
        let channel = guild.channels.cache.find(ch => ch.name === client.settings.get(guildId, "notificationChannel"));

        let profiles = (await (await fetch(nameFetchApi.replace("{steamids}", steamIds.join(",")), {method: "Get"})).json()).response.players.map((p) => {
            return {
                steamid: p.steamid,
                personaname: p.personaname,
                avatarmedium: p.avatarmedium,
                profileurl: p.profileurl
            };
        });

        let purchasesToAnnounce = [];

        for (const steamId of steamIds) {
            let hashId = `${guildId} - ${steamId}`;
            let games = (await (await fetch(gameFetchApi.replace("{steamid}", steamId), {method: "Get"})).json()).response?.games;
            if (games === undefined) continue;

            if (client.steamHash.get(hashId).length === 0) {
                client.steamHash.set(hashId, games.map(g => g.appid));
            } else {
                for (const game of games) {
                    if (!client.steamHash.includes(hashId, game.appid)) {
                        console.log(steamId + " has purchased " + game.name);
                        client.steamHash.push(hashId, game.appid);
                        purchasesToAnnounce.push({
                            steamId: steamId,
                            gameName: game.name,
                            appid: game.appid,
                            img_icon_url: game.img_icon_url,
                            img_logo_url: game.img_logo_url
                        });
                    }
                }
            }
        }

        for (const purchase of purchasesToAnnounce) {
            let profile = profiles.find(p => p.steamid === purchase.steamId);

            let embed = new Discord.MessageEmbed();
            try {
                embed.setAuthor(profile.personaname, profile.avatarmedium, profile.profileurl);
                embed.setThumbnail(gameImgApi.replace("{appid}", purchase.appid).replace("{hash}", purchase.img_icon_url));
                embed.setImage(gameImgApi.replace("{appid}", purchase.appid).replace("{hash}", purchase.img_logo_url));
                embed.setDescription(`${profile.personaname} has purchased ${purchase.gameName}`);
                embed.setURL(storeUrl.replace("{appid}", purchase.appid));
                embed.setTitle(purchase.gameName);
            } catch (err) {
                console.log(err);
            }

            channel.send({embeds: [embed]}).catch(err => {
                console.log(err);
            });
        }
    }
}, 600000);

client.on("ready", client => {
    console.log("Damn I'm ready now!\nBtw I'm in " + client.guilds.cache.size + " guilds.");
})

client.on("guildDelete", guild => {
    client.settings.delete(guild.id);
    console.log(`Left guild: ${guild.name}`);
});

client.on("guildCreate", guild => {
    console.log(`Joined guild: ${guild.name}`);
});

client.on("messageCreate", message => {
    if (!message.guild || message.author.bot || (message.guild.ownerId !== message.author.id)) return;

    const guildConf = client.settings.get(message.guild.id);

    if (message.content.indexOf(guildConf.prefix) !== 0) return;

    const args = message.content.split(" ");
    const command = args.shift().slice(guildConf.prefix.length).toLowerCase();
    if (command === "conf") {
        if (args.length === 0) {
            message.reply("```json\n" + JSON.stringify(guildConf, null, 4) + "\n```");
            return;
        }

        if (args[0] === "steamid") {
            if (args.length === 1) {
                message.reply("```json\n" + JSON.stringify(guildConf.steamIds, null, 4) + "\n```");
                return;
            } else if (args[1] === "add") {
                if (args.length === 2) {
                    message.reply("You must provide a valid steamid to add.");
                    return;
                } else {
                    let sid = new SteamID(args[2]);

                    if (sid.isValid()) {
                        client.settings.push(message.guild.id, sid.getSteamID64(), "steamIds");
                        message.reply("`" + sid.getSteamID64() + "` has been added to the tracked list.");
                    }
                }
            } else if (args[1] === "rem") {
                if (args.length === 2) {
                    message.reply("You must provide a valid steamid to remove.");
                    return;
                } else {
                    let sid = new SteamID(args[2]);

                    if (sid.isValid() && client.settings.has(message.guild.id, sid.getSteamID64(), "steamIds")) {
                        client.settings.remove(message.guild.id, sid.getSteamID64(), "steamIds");
                        message.reply("`" + sid.getSteamID64() + "` removed from the tracked list.");
                    } else {
                        message.reply("Couldn't remove the id. Are you sure it's valid and not already removed?");
                    }
                }
            }
        } else if (args[0] === "channel") {
            if (args.length === 1) {
                message.reply("```json\n" + JSON.stringify(guildConf.notificationChannel, null, 4) + "\n```");
                return;
            } else if (args[1] === "set") {
                if (args.length === 2) {
                    message.reply("You must provide a new channel name.");
                    return;
                } else {
                    client.settings.set(message.guild.id, args[2], "notificationChannel");
                    message.reply(`Purchase notifications will now be sent to \`${args[2]}\`.`);
                }
            }
        } else if (args[0] === "prefix") {
            if (args.length === 1) {
                message.reply("```json\n" + JSON.stringify(guildConf.prefix, null, 4) + "\n```");
                return;
            } else if (args[1] === "set") {
                if (args.length === 2) {
                    message.reply("You must provide a new prefix.");
                    return;
                } else {
                    client.settings.set(message.guild.id, args[2], "prefix");
                    message.reply(`Command prefix has been set to \`${args[2]}\`.`);
                }
            }
        }
    } else if (command === "help" || command === "h") {
        message.reply(`Available commands:
        \`${client.settings.get(message.guild.id, "prefix")}help\` shows this message.
        \`${client.settings.get(message.guild.id, "prefix")}conf\` shows current configs.
        \`${client.settings.get(message.guild.id, "prefix")}conf steamid add <id>\` adds a steamid to track purchases from.
        \`${client.settings.get(message.guild.id, "prefix")}conf steamid rem <id>\` removes a steamid from the tracked list.
        \`${client.settings.get(message.guild.id, "prefix")}conf channel set <channel-name>\` sets the channel to post purchases in.
        \`${client.settings.get(message.guild.id, "prefix")}conf prefix set <command-prefix>\` sets the command prefix.`);
    }
})

client.login(config.discord.token).catch(err => {
    console.log(err);
});
