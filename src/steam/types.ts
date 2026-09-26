/** Subset of the fields returned by `ISteamUser/GetPlayerSummaries`. */
export interface PlayerSummary {
    steamid: string;
    personaname: string;
    profileurl: string;
    avatarmedium: string;
}

export interface GetPlayerSummariesResponse {
    response?: {
        players?: PlayerSummary[];
    };
}

/** Subset of the fields returned by `IPlayerService/GetOwnedGames` with `include_appinfo=true`. */
export interface OwnedGame {
    appid: number;
    name: string;
    img_icon_url?: string;
    /** No longer returned by Steam, but kept in case it comes back. */
    img_logo_url?: string;
}

export interface GetOwnedGamesResponse {
    response?: {
        game_count?: number;
        /** Missing when the profile or its game details are private. */
        games?: OwnedGame[];
    };
}

export interface PriceOverview {
    currency: string;
    /** Price in the smallest currency unit (e.g. cents). */
    initial: number;
    /** Price in the smallest currency unit (e.g. cents). */
    final: number;
    discount_percent: number;
    initial_formatted?: string;
    final_formatted?: string;
}

/**
 * `store/api/appdetails` keyed by app ID. With `filters=price_overview` the `data` field is an
 * empty array for apps without a price (e.g. free games).
 */
export type AppDetailsResponse = Record<string, {
    success: boolean;
    data?: { price_overview?: PriceOverview } | [];
} | undefined>;
