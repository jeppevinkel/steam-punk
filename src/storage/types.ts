export interface RssFeedConfig {
    title: string;
    /** The generated RSS url. Also used to identify the feed when removing it. */
    url: string;
    /** Name of the channel the feed is posted to. */
    channel: string;
}

export interface GuildSettings {
    prefix: string;
    notificationChannelId: string;
    steamIds: string[];
    rssFeeds: RssFeedConfig[];
    /**
     * Channel name used by old versions of the bot before channel IDs were stored.
     * Only read once to migrate to {@link GuildSettings.notificationChannelId}.
     * @deprecated
     */
    notificationChannel?: string;
}

export interface RssHistory {
    appsIds: string[];
}
