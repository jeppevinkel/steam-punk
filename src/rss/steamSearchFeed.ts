const RSS_BRIDGE_URL = 'https://andreasaronsson.com/!rss/steam_search.php';

/** Builds an RSS feed url for a Steam store search. */
export function createRssUrl(title: string, searchUrl: string): string {
    return `${RSS_BRIDGE_URL}?title=${encodeURIComponent(title)}&url=${encodeURIComponent(searchUrl)}`;
}

export function extractAppId(url: string): string | null {
    return /app\/(\d+)/.exec(url)?.[1] ?? null;
}

export function isValidUrl(url: string): boolean {
    return /^https?:\/\/[^ "]+$/.test(url);
}
