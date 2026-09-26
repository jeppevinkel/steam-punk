import { EmbedBuilder } from 'discord.js';
import { appHeaderUrl, appImageUrl, storeUrl } from '../steam/index.ts';
import type { OwnedGame, PlayerSummary, PriceOverview } from '../steam/index.ts';
import { formatPrice } from '../util/format.ts';

function gameEmbed(game: OwnedGame): EmbedBuilder {
    const embed = new EmbedBuilder()
        .setTitle(game.name)
        .setURL(storeUrl(game.appid))
        .setImage(game.img_logo_url ? appImageUrl(game.appid, game.img_logo_url) : appHeaderUrl(game.appid));

    if (game.img_icon_url) {
        embed.setThumbnail(appImageUrl(game.appid, game.img_icon_url));
    }
    return embed;
}

export function purchaseEmbed(game: OwnedGame, profile: PlayerSummary | undefined): EmbedBuilder {
    const embed = gameEmbed(game)
        .setDescription(`${game.name} has been added to the library`);

    if (profile) {
        embed.setAuthor({
            name: profile.personaname,
            iconURL: profile.avatarmedium,
            url: profile.profileurl,
        });
    }
    return embed;
}

export function dealEmbed(game: OwnedGame, price: PriceOverview): EmbedBuilder {
    const finalPrice = price.discount_percent >= 100 ? 0 : price.final;

    return gameEmbed(game)
        .setAuthor({ name: 'STEAM DEALS' })
        .setDescription(`${game.name} is currently on a ${price.discount_percent}% sale!`)
        .addFields(
            { name: 'Normal Price', value: formatPrice(price.initial, price.currency) },
            { name: 'Current Price', value: formatPrice(finalPrice, price.currency) },
        );
}
