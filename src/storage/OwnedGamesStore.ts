import Enmap from 'enmap';

/**
 * Remembers which games each tracked account owned the last time it was checked, per guild.
 * Keys use the `"<guildId> - <steamId>"` format for compatibility with existing data.
 */
export class OwnedGamesStore {
    readonly #db = new Enmap<number[]>({ name: 'steamHash' });

    static #key(guildId: string, steamId: string): string {
        return `${guildId} - ${steamId}`;
    }

    /** @returns The known app IDs, or `undefined` if the account has never been checked in this guild. */
    getKnownAppIds(guildId: string, steamId: string): Set<number> | undefined {
        const appIds = this.#db.get(OwnedGamesStore.#key(guildId, steamId));
        return appIds === null ? undefined : new Set(appIds);
    }

    setKnownAppIds(guildId: string, steamId: string, appIds: Iterable<number>): void {
        this.#db.set(OwnedGamesStore.#key(guildId, steamId), [...new Set(appIds)]);
    }

    forget(guildId: string, steamId: string): void {
        this.#db.delete(OwnedGamesStore.#key(guildId, steamId));
    }

    forgetGuild(guildId: string): void {
        const prefix = OwnedGamesStore.#key(guildId, '');
        for (const key of this.#db.keys()) {
            if (key.startsWith(prefix)) this.#db.delete(key);
        }
    }
}
