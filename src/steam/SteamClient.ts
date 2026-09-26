import { chunk } from '../util/chunk.ts';
import type {
    AppDetailsResponse,
    GetOwnedGamesResponse,
    GetPlayerSummariesResponse,
    OwnedGame,
    PlayerSummary,
    PriceOverview,
} from './types.ts';

const WEB_API_BASE = 'https://api.steampowered.com';
const STORE_API_BASE = 'https://store.steampowered.com/api';
const REQUEST_TIMEOUT_MS = 30_000;
/** GetPlayerSummaries accepts at most 100 IDs per request. */
const MAX_PLAYER_SUMMARY_IDS = 100;

export class SteamApiError extends Error {
    override readonly name = 'SteamApiError';

    readonly url: string;
    readonly status: number;

    constructor(url: string, status: number) {
        super(`Steam request to ${url} failed with HTTP ${status}.`);
        this.url = url;
        this.status = status;
    }
}

export class SteamClient {
    readonly #apiKey: string;

    constructor(apiKey: string) {
        this.#apiKey = apiKey;
    }

    async getPlayerSummaries(steamIds: readonly string[]): Promise<PlayerSummary[]> {
        const batches = await Promise.all(chunk(steamIds, MAX_PLAYER_SUMMARY_IDS).map(ids =>
            this.#fetchJson<GetPlayerSummariesResponse>(this.#webApiUrl('ISteamUser/GetPlayerSummaries/v2', {
                steamids: ids.join(','),
            })),
        ));
        return batches.flatMap(batch => batch.response?.players ?? []);
    }

    /** @returns The owned games, or `undefined` if Steam didn't return them (e.g. private profile). */
    async getOwnedGames(steamId: string): Promise<OwnedGame[] | undefined> {
        const data = await this.#fetchJson<GetOwnedGamesResponse>(this.#webApiUrl('IPlayerService/GetOwnedGames/v0001', {
            steamid: steamId,
            include_appinfo: 'true',
            skip_unvetted_apps: 'false',
            include_played_free_games: '1',
        }));
        return data.response?.games;
    }

    /** @returns Price info for every app that has one. Apps without a price are left out. */
    async getPriceOverviews(appIds: readonly number[]): Promise<Map<number, PriceOverview>> {
        const prices = new Map<number, PriceOverview>();
        if (appIds.length === 0) return prices;

        const url = new URL(`${STORE_API_BASE}/appdetails`);
        url.searchParams.set('appids', appIds.join(','));
        url.searchParams.set('filters', 'price_overview');
        const data = await this.#fetchJson<AppDetailsResponse>(url);

        for (const appId of appIds) {
            const details = data[appId];
            if (!details?.success || !details.data || Array.isArray(details.data)) continue;
            const price = details.data.price_overview;
            if (price) prices.set(appId, price);
        }
        return prices;
    }

    #webApiUrl(endpoint: string, params: Record<string, string>): URL {
        const url = new URL(`${WEB_API_BASE}/${endpoint}/`);
        url.searchParams.set('key', this.#apiKey);
        url.searchParams.set('format', 'json');
        for (const [name, value] of Object.entries(params)) {
            url.searchParams.set(name, value);
        }
        return url;
    }

    async #fetchJson<T>(url: URL): Promise<T> {
        const res = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
        if (!res.ok) {
            // Don't leak the API key into logs.
            url.searchParams.delete('key');
            throw new SteamApiError(url.toString(), res.status);
        }
        return await res.json() as T;
    }
}
