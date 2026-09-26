export function storeUrl(appId: number): string {
    return `https://store.steampowered.com/app/${appId}/`;
}

/** URL of an app image identified by a hash, such as `img_icon_url` from GetOwnedGames. */
export function appImageUrl(appId: number, hash: string): string {
    return `https://media.steampowered.com/steamcommunity/public/images/apps/${appId}/${hash}.jpg`;
}

export function appHeaderUrl(appId: number): string {
    return `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`;
}
