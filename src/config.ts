export interface AppConfig {
    readonly discord: {
        readonly token: string;
        readonly clientId: string;
    };
    readonly steam: {
        readonly apiKey: string;
    };
    /** How often owned games and RSS feeds are checked. */
    readonly checkIntervalMs: number;
}

const DEFAULT_CHECK_INTERVAL_MS = 10 * 60 * 1000;

export class ConfigError extends Error {
    override readonly name = 'ConfigError';
}

function requireEnv(env: NodeJS.ProcessEnv, name: string): string {
    const value = env[name]?.trim();
    if (!value) {
        throw new ConfigError(`Missing required environment variable ${name}.`);
    }
    return value;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
    return {
        discord: {
            token: requireEnv(env, 'DISCORD_TOKEN'),
            clientId: requireEnv(env, 'DISCORD_CLIENT_ID'),
        },
        steam: {
            apiKey: requireEnv(env, 'STEAM_API_KEY'),
        },
        checkIntervalMs: DEFAULT_CHECK_INTERVAL_MS,
    };
}
