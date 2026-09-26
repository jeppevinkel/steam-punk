import type { Client } from 'discord.js';
import type { BotContext } from '../context.ts';
import { findSendableChannelByName } from '../util/channels.ts';

/** Old versions stored the notification channel by name; convert those to channel IDs. */
function migrateLegacyChannelNames(client: Client<true>, { stores }: BotContext): void {
    for (const guild of client.guilds.cache.values()) {
        const settings = stores.settings.get(guild.id);
        if (settings.notificationChannelId || !settings.notificationChannel) continue;

        const channel = findSendableChannelByName(guild, settings.notificationChannel);
        if (channel) {
            stores.settings.setNotificationChannel(guild.id, channel.id);
        }
    }
}

export function handleReady(client: Client<true>, ctx: BotContext): void {
    console.log(`Damn I'm ready now!\nBtw I'm in ${client.guilds.cache.size} guilds.`);
    migrateLegacyChannelNames(client, ctx);
}
