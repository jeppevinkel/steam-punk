import type {
    AutocompleteInteraction,
    ChatInputCommandInteraction,
    RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord.js';
import type { BotContext } from '../context.ts';

export interface SlashCommand {
    readonly data: {
        readonly name: string;
        toJSON(): RESTPostAPIChatInputApplicationCommandsJSONBody;
    };
    /** Commands are guild-only, so the interaction is always from a cached guild. */
    execute(interaction: ChatInputCommandInteraction<'cached'>, ctx: BotContext): Promise<void>;
    /** Required if any of the command's options use autocomplete. */
    autocomplete?(interaction: AutocompleteInteraction<'cached'>, ctx: BotContext): Promise<void>;
}
