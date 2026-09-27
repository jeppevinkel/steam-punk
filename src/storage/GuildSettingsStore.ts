import Enmap from 'enmap';
import type { GuildSettings, RssFeedConfig } from './types.ts';

function createDefaults(): GuildSettings {
    return {
        notificationChannelId: '',
        steamIds: [],
        rssFeeds: [],
    };
}

/**
 * Typed access to the per-guild configuration.
 *
 * Every read is merged with the defaults, so records written by older versions of the bot
 * (which may lack fields such as `rssFeeds`) are always complete.
 */
export class GuildSettingsStore {
    readonly #db = new Enmap<GuildSettings>({ name: 'settings' });

    get(guildId: string): GuildSettings {
        const stored = this.#db.get(guildId);
        const settings = { ...createDefaults(), ...stored };
        if (stored === null) {
            this.#db.set(guildId, settings);
        }
        return settings;
    }

    delete(guildId: string): void {
        this.#db.delete(guildId);
    }

    setNotificationChannel(guildId: string, channelId: string): void {
        this.#update(guildId, settings => ({ ...settings, notificationChannelId: channelId }));
    }

    /** @returns `false` if the SteamID was already tracked. */
    addSteamId(guildId: string, steamId: string): boolean {
        const settings = this.get(guildId);
        if (settings.steamIds.includes(steamId)) return false;
        this.#db.set(guildId, { ...settings, steamIds: [...settings.steamIds, steamId] });
        return true;
    }

    /** @returns `false` if the SteamID wasn't tracked. */
    removeSteamId(guildId: string, steamId: string): boolean {
        const settings = this.get(guildId);
        if (!settings.steamIds.includes(steamId)) return false;
        this.#db.set(guildId, { ...settings, steamIds: settings.steamIds.filter(id => id !== steamId) });
        return true;
    }

    /** @returns `false` if a feed with the same title or url already exists. */
    addRssFeed(guildId: string, feed: RssFeedConfig): boolean {
        const settings = this.get(guildId);
        if (settings.rssFeeds.some(f => f.title === feed.title || f.url === feed.url)) return false;
        this.#db.set(guildId, { ...settings, rssFeeds: [...settings.rssFeeds, feed] });
        return true;
    }

    /** @returns The removed feed, or `undefined` if no feed has the given title or url. */
    removeRssFeed(guildId: string, titleOrUrl: string): RssFeedConfig | undefined {
        const settings = this.get(guildId);
        const feed = settings.rssFeeds.find(f => f.title === titleOrUrl)
            ?? settings.rssFeeds.find(f => f.url === titleOrUrl);
        if (feed) {
            this.#db.set(guildId, { ...settings, rssFeeds: settings.rssFeeds.filter(f => f !== feed) });
        }
        return feed;
    }

    #update(guildId: string, updater: (settings: GuildSettings) => GuildSettings): void {
        this.#db.set(guildId, updater(this.get(guildId)));
    }
}
