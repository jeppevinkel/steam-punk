export interface RssFeedConfig {
    title: string;
    /** The generated RSS url. Also used to identify the feed when removing it. */
    url: string;
    /** ID of the channel the feed is posted to. */
    channelId?: string;
    /**
     * Channel name used by feeds added before channel IDs were stored.
     * Only used when {@link RssFeedConfig.channelId} is missing.
     */
    channel?: string;
}

export interface GuildSettings {
    notificationChannelId: string;
    steamIds: string[];
    rssFeeds: RssFeedConfig[];
    /**
     * Channel name used by old versions of the bot before channel IDs were stored.
     * Only read once to migrate to {@link GuildSettings.notificationChannelId}.
     * @deprecated
     */
    notificationChannel?: string;
    /**
     * Command prefix used by the removed text commands. Old records may still contain it.
     * @deprecated
     */
    prefix?: string;
}

export interface RssHistory {
    appsIds: string[];
}
