import { GuildSettingsStore } from './GuildSettingsStore.ts';
import { OwnedGamesStore } from './OwnedGamesStore.ts';
import { RssHistoryStore } from './RssHistoryStore.ts';

export { GuildSettingsStore } from './GuildSettingsStore.ts';
export { OwnedGamesStore } from './OwnedGamesStore.ts';
export { RssHistoryStore } from './RssHistoryStore.ts';
export type * from './types.ts';

export interface Stores {
    readonly settings: GuildSettingsStore;
    readonly ownedGames: OwnedGamesStore;
    readonly rssHistory: RssHistoryStore;
}

export function createStores(): Stores {
    return {
        settings: new GuildSettingsStore(),
        ownedGames: new OwnedGamesStore(),
        rssHistory: new RssHistoryStore(),
    };
}
