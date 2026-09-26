const MESSAGE_LIMIT = 2000;

/** Formats a value as a JSON code block that fits within Discord's message limit. */
export function jsonBlock(value: unknown): string {
    const open = '```json\n';
    const close = '\n```';
    const truncated = '\n…';
    let json = JSON.stringify(value, null, 4) ?? 'null';
    const room = MESSAGE_LIMIT - open.length - close.length;
    if (json.length > room) {
        json = json.slice(0, room - truncated.length) + truncated;
    }
    return open + json + close;
}

/** Formats an amount in the smallest currency unit, e.g. `1999, 'EUR'` → `19.99 EUR`. */
export function formatPrice(minorUnits: number, currency: string): string {
    return `${(minorUnits / 100).toFixed(2)} ${currency}`;
}

export function errorMessage(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
}
