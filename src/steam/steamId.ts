import SteamID from 'steamid';

/**
 * Parses any SteamID format into a SteamID64.
 * @returns `null` if the input isn't a valid individual account.
 */
export function parseSteamId64(input: string): string | null {
    try {
        const sid = new SteamID(input.trim());
        return sid.isValidIndividual() ? sid.getSteamID64() : null;
    } catch {
        // The constructor throws on input it can't parse at all.
        return null;
    }
}
