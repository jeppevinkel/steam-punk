import Enmap from 'enmap';
import type { RssHistory } from './types.ts';

/** Remembers which RSS items have already been posted in each guild. */
export class RssHistoryStore {
    readonly #db = new Enmap<RssHistory>({ name: 'rssHash' });

    #get(guildId: string): RssHistory {
        return this.#db.get(guildId) ?? { appsIds: [] };
    }

    hasPosted(guildId: string, itemId: string): boolean {
        return this.#get(guildId).appsIds.includes(itemId);
    }

    markPosted(guildId: string, itemId: string): void {
        const history = this.#get(guildId);
        if (history.appsIds.includes(itemId)) return;
        this.#db.set(guildId, { ...history, appsIds: [...history.appsIds, itemId] });
    }

    forgetGuild(guildId: string): void {
        this.#db.delete(guildId);
    }
}
