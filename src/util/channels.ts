import type { Guild, SendableChannels } from 'discord.js';

export function getSendableChannel(guild: Guild, channelId: string): SendableChannels | undefined {
    if (!channelId) return undefined;
    const channel = guild.channels.cache.get(channelId);
    return channel?.isSendable() ? channel : undefined;
}

export function findSendableChannelByName(guild: Guild, name: string): SendableChannels | undefined {
    const channel = guild.channels.cache.find(ch => ch.name === name && ch.isSendable());
    return channel?.isSendable() ? channel : undefined;
}
