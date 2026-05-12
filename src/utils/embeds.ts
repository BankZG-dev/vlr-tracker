import { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { HenrikAccount, HenrikMMRData, HenrikMatchData, MatchPlayer, StorefrontResponse, VP_CURRENCY_ID, RP_CURRENCY_ID } from '../types';
import { RatingResult, getGradeColor, getRankColor } from './rating';
import { getRankIcon, getRankName, getSkinByLevelUUID, getBundleInfo, getTierInfo } from '../api/valorant-assets';

// ─── Stats/Profile Embed ───

export async function buildProfileEmbed(
    account: HenrikAccount,
    mmr: HenrikMMRData,
    rating: RatingResult,
    seasonName?: string,
): Promise<EmbedBuilder> {
    const rankIcon = await getRankIcon(mmr.current?.tier?.id ?? 0);
    const currentRank = mmr.current?.tier?.name || 'Unranked';
    const rr = mmr.current?.rr ?? 0;
    const lastChange = mmr.current?.last_change ?? 0;
    const changeEmoji = lastChange > 0 ? '📈' : lastChange < 0 ? '📉' : '➖';
    const changeStr = lastChange > 0 ? `+${lastChange}` : `${lastChange}`;

    const peakRank = mmr.highest?.tier?.name || 'N/A';
    const peakSeason = mmr.highest?.act_patched || '';

    // Current season stats
    const currentSeason = mmr.seasonal?.[mmr.seasonal.length - 1];
    const wins = currentSeason?.wins ?? 0;
    const games = currentSeason?.games ?? 0;
    const losses = games - wins;

    const embed = new EmbedBuilder()
        .setColor(getRankColor(mmr.current?.tier?.id ?? 0))
        .setTitle(`🎯 ${account.name}#${account.tag}`)
        .setDescription(`**Level ${account.account_level}**`)
        .addFields(
            {
                name: '🏆 Current Rank',
                value: `**${currentRank}** — ${rr} RR\n${changeEmoji} ${changeStr} RR last game`,
                inline: true,
            },
            {
                name: '⭐ Peak Rank',
                value: `**${peakRank}**\n${peakSeason}`,
                inline: true,
            },
            {
                name: '📈 Rating (Last 10)',
                value: `**${rating.overall}** ${rating.grade}`,
                inline: true,
            },
            {
                name: `📊 ${seasonName || 'Season'} Record`,
                value: `**${wins}W** / **${losses}L** (${games} games)\nWin Rate: **${rating.winPercent}%**`,
                inline: true,
            },
            {
                name: '⚔️ K/D',
                value: `**${rating.kd}**`,
                inline: true,
            },
            {
                name: '🎯 HS%',
                value: `**${rating.hsPercent}%**`,
                inline: true,
            },
            {
                name: '💥 DMG/Rnd',
                value: `**${rating.dmgPerRound}**`,
                inline: true,
            },
            {
                name: '🏅 ACS',
                value: `**${rating.acs}**`,
                inline: true,
            },
            {
                name: '🔫 K/Rnd',
                value: `**${rating.killsPerRound}**`,
                inline: true,
            },
        )
        .setTimestamp()
        .setFooter({ text: `VLR Track • ${seasonName || 'Current Season'} Stats` });

    if (rankIcon) {
        embed.setThumbnail(rankIcon);
    }

    if (account.card?.wide) {
        embed.setImage(account.card.wide);
    }

    return embed;
}

// ─── Match List Embed ───

export async function buildMatchListEmbed(
    playerName: string,
    playerTag: string,
    matches: HenrikMatchData[],
): Promise<{ embed: EmbedBuilder; selectMenu: ActionRowBuilder<StringSelectMenuBuilder> }> {
    const matchLines: string[] = [];
    const options: { label: string; description: string; value: string }[] = [];

    for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        const player = match.players.all_players.find(p => 
            p.name.toLowerCase() === playerName.toLowerCase() && 
            p.tag.toLowerCase() === playerTag.toLowerCase()
        );
        if (!player) continue;

        const playerTeamColor = player.team.toLowerCase() as 'red' | 'blue';
        const team = match.teams[playerTeamColor];
        const won = team?.has_won ?? false;
        const teamWon = team?.rounds_won ?? 0;
        const teamLost = team?.rounds_lost ?? 0;
        const resultEmoji = won ? '🟢' : '🔴';
        const resultText = won ? 'WIN' : 'LOSS';

        const totalRounds = Math.max(teamWon + teamLost, 1);
        const acs = Math.round(player.stats.score / totalRounds);
        const kda = `${player.stats.kills}/${player.stats.deaths}/${player.stats.assists}`;

        const mapName = match.metadata.map;
        const agentName = player.agent.name;

        matchLines.push(
            `${resultEmoji} **${mapName}** • ${teamWon}-${teamLost} • ${agentName}\n` +
            `   ${kda} KDA • ${acs} ACS`
        );

        options.push({
            label: `${resultText} — ${mapName} (${teamWon}-${teamLost})`,
            description: `${agentName} • ${kda} • ${acs} ACS`,
            value: `match_${match.metadata.matchid}_${i}`,
        });
    }

    const embed = new EmbedBuilder()
        .setColor(0xFF4654)
        .setTitle(`📋 Last ${matches.length} Ranked Matches — ${playerName}#${playerTag}`)
        .setDescription(matchLines.join('\n\n') || 'No matches found')
        .setTimestamp()
        .setFooter({ text: 'Select a match below to see the full scoreboard' });

    const selectMenu = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('match_select')
            .setPlaceholder('🔍 Select a match to view details...')
            .addOptions(options.length > 0 ? options : [{ label: 'No matches', value: 'none', description: 'No matches available' }])
    );

    return { embed, selectMenu };
}

// ─── Match Detail / Scoreboard Embed ───

export async function buildMatchDetailEmbed(
    match: HenrikMatchData,
    highlightPuuid?: string
): Promise<EmbedBuilder[]> {
    const mapName = match.metadata.map;
    const teams = match.teams;
    const totalRounds = match.teams.red.rounds_won + match.teams.blue.rounds_won || 1;

    // Sort players by ACS
    const sortedPlayers = [...match.players.all_players].sort((a, b) => {
        return (b.stats.score / totalRounds) - (a.stats.score / totalRounds);
    });

    // Group by team
    const teamGroups: Record<string, MatchPlayer[]> = {};
    for (const player of sortedPlayers) {
        const tid = player.team.toLowerCase();
        if (!teamGroups[tid]) teamGroups[tid] = [];
        teamGroups[tid].push(player);
    }

    const embeds: EmbedBuilder[] = [];

    // Header embed
    const team1 = match.teams.red;
    const team2 = match.teams.blue;
    const score = `${team1?.rounds_won ?? 0} — ${team2?.rounds_won ?? 0}`;

    const headerEmbed = new EmbedBuilder()
        .setColor(0xFF4654)
        .setTitle(`🗺️ ${mapName}`)
        .setDescription(
            `**Score: ${score}**\n` +
            `🕐 ${match.metadata.game_start_patched || new Date(match.metadata.game_start * 1000).toLocaleDateString()}`
        )
        .setTimestamp();

    embeds.push(headerEmbed);

    // Team embeds
    for (const [teamId, players] of Object.entries(teamGroups)) {
        const team = match.teams[teamId as 'red' | 'blue'];
        const isWinner = team?.has_won ?? false;
        const teamColor = isWinner ? 0x4CAF50 : 0xF44336;
        const teamLabel = isWinner ? '🏆 WINNERS' : '💀 LOSERS';
        const teamRounds = `${team?.rounds_won ?? 0}W / ${team?.rounds_lost ?? 0}L`;

        let scoreboardText = '';
        for (const player of players) {
            const acs = Math.round(player.stats.score / totalRounds);
            const kda = `${player.stats.kills}/${player.stats.deaths}/${player.stats.assists}`;
            const totalShots = player.stats.headshots + player.stats.bodyshots + player.stats.legshots;
            const hs = totalShots > 0 ? Math.round((player.stats.headshots / totalShots) * 100) : 0;
            const dmg = Math.round(player.damage_made / totalRounds);

            const isHighlighted = player.puuid === highlightPuuid;
            const prefix = isHighlighted ? '**▸ ' : '  ';
            const suffix = isHighlighted ? ' ◂**' : '';
            const rankName = player.tier?.name ? ` [${player.tier.name}]` : '';

            scoreboardText += `${prefix}${player.agent.name} • ${player.name}#${player.tag}${rankName}\n`;
            scoreboardText += `${prefix}${kda} KDA • ${acs} ACS • ${hs}% HS • ${dmg} DMG${suffix}\n\n`;
        }

        const teamEmbed = new EmbedBuilder()
            .setColor(teamColor)
            .setTitle(`${teamLabel} (${teamRounds})`)
            .setDescription(scoreboardText || 'No players');

        embeds.push(teamEmbed);
    }

    return embeds;
}

// ─── Store Embed ───

export async function buildStoreEmbed(
    storefront: StorefrontResponse,
    wallet: Record<string, number>,
    riotUsername: string,
    riotTag: string
): Promise<EmbedBuilder[]> {
    const embeds: EmbedBuilder[] = [];

    // VP balance
    const vpBalance = wallet[VP_CURRENCY_ID] ?? 0;
    const rpBalance = wallet[RP_CURRENCY_ID] ?? 0;

    // ─── Daily Store ───
    const dailySkins = storefront.SkinsPanelLayout;
    const remainingHours = Math.floor(dailySkins.SingleItemOffersRemainingDurationInSeconds / 3600);
    const remainingMins = Math.floor((dailySkins.SingleItemOffersRemainingDurationInSeconds % 3600) / 60);

    let dailyDescription = `💰 **VP:** ${vpBalance.toLocaleString()} | **RP:** ${rpBalance.toLocaleString()}\n`;
    dailyDescription += `⏱️ Resets in **${remainingHours}h ${remainingMins}m**`;

    const dailyEmbed = new EmbedBuilder()
        .setColor(0xFF4654)
        .setTitle(`🛒 Daily Store — ${riotUsername}#${riotTag}`)
        .setDescription(dailyDescription);
    embeds.push(dailyEmbed);

    for (const offer of dailySkins.SingleItemStoreOffers) {
        const skinUuid = offer.Rewards?.[0]?.ItemID;
        if (!skinUuid) continue;

        const skinInfo = await getSkinByLevelUUID(skinUuid);
        const cost = offer.Cost?.[VP_CURRENCY_ID] ?? 0;

        const costTier = getCostTierEmoji(cost);
        const skinEmbed = new EmbedBuilder()
            .setColor(0x2B2D31)
            .setDescription(`${costTier} **${skinInfo.displayName}**\n💵 **${cost.toLocaleString()} VP**`);
            
        if (skinInfo.displayIcon) {
            skinEmbed.setThumbnail(skinInfo.displayIcon);
        }
        
        embeds.push(skinEmbed);
    }

    // ─── Featured Bundle ───
    if (storefront.FeaturedBundle?.Bundle) {
        const bundle = storefront.FeaturedBundle.Bundle;
        const bundleInfo = await getBundleInfo(bundle.DataAssetID);
        const bundleHours = Math.floor(storefront.FeaturedBundle.BundleRemainingDurationInSeconds / 3600);
        const bundleDays = Math.floor(bundleHours / 24);
        const bundleRemainingHours = bundleHours % 24;

        const totalCost = bundle.TotalDiscountedCost?.[VP_CURRENCY_ID] ?? bundle.TotalBaseCost?.[VP_CURRENCY_ID] ?? 0;

        let bundleDesc = `💵 **${totalCost.toLocaleString()} VP**\n`;
        bundleDesc += `⏱️ ${bundleDays}d ${bundleRemainingHours}h remaining\n\n`;

        if (bundle.Items) {
            for (const item of bundle.Items.slice(0, 10)) {
                const itemInfo = await getSkinByLevelUUID(item.Item.ItemID);
                const itemCost = item.DiscountedPrice || item.BasePrice;
                bundleDesc += `  • ${itemInfo.displayName} — ${itemCost.toLocaleString()} VP\n`;
            }
        }

        const bundleEmbed = new EmbedBuilder()
            .setColor(0x9B59B6)
            .setTitle(`📦 ${bundleInfo.displayName || 'Featured Bundle'}`)
            .setDescription(bundleDesc);

        if (bundleInfo.displayIcon) {
            bundleEmbed.setThumbnail(bundleInfo.displayIcon);
        }

        embeds.push(bundleEmbed);
    }

    // ─── Night Market ───
    if (storefront.BonusStore) {
        const nightMarket = storefront.BonusStore;
        const nmHours = Math.floor(nightMarket.BonusStoreRemainingDurationInSeconds / 3600);
        const nmDays = Math.floor(nmHours / 24);
        const nmRemHours = nmHours % 24;

        let nmDesc = `⏱️ ${nmDays}d ${nmRemHours}h remaining`;

        const nmEmbed = new EmbedBuilder()
            .setColor(0x2ECC71)
            .setTitle('🌙 Night Market')
            .setDescription(nmDesc);
        embeds.push(nmEmbed);

        for (const offer of nightMarket.BonusStoreOffers) {
            const skinUuid = offer.Offer.Rewards?.[0]?.ItemID;
            if (!skinUuid) continue;

            const skinInfo = await getSkinByLevelUUID(skinUuid);
            const originalCost = offer.Offer.Cost?.[VP_CURRENCY_ID] ?? 0;
            const discountedCost = offer.DiscountCosts?.[VP_CURRENCY_ID] ?? 0;
            const discountPct = offer.DiscountPercent;

            const offerEmbed = new EmbedBuilder()
                .setColor(0x2ECC71)
                .setDescription(`🏷️ **${skinInfo.displayName}**\n~~${originalCost.toLocaleString()}~~ → **${discountedCost.toLocaleString()} VP** (-${discountPct}%)`);
                
            if (skinInfo.displayIcon) {
                offerEmbed.setThumbnail(skinInfo.displayIcon);
            }
            embeds.push(offerEmbed);
        }
    }

    return embeds;
}

function getCostTierEmoji(cost: number): string {
    if (cost >= 2475) return '🟠'; // Exclusive
    if (cost >= 1775) return '🟡'; // Premium
    if (cost >= 1275) return '🟣'; // Deluxe
    if (cost >= 875) return '🔵';  // Select
    return '🟢'; // Sideline
}

// ─── Help Embed ───

export function buildHelpEmbed(): EmbedBuilder {
    return new EmbedBuilder()
        .setColor(0xFF4654)
        .setTitle('🎮 VLR Track — Valorant Stats Bot')
        .setDescription('Your personal Valorant stats tracker and store checker.')
        .addFields(
            {
                name: '📊 `/stats [player]`',
                value: 'View ranked stats, current rank, K/D, HS%, ACS, and VLR-style rating.\n`/stats player:Uncle Hope#diff` or just `/stats` if registered.',
            },
            {
                name: '📋 `/matches [player]`',
                value: 'View last 5 ranked matches with interactive scoreboard viewer.\n`/matches player:Uncle Hope#diff` or just `/matches` if registered.',
            },
            {
                name: '🔑 `/register`',
                value: 'Link your Riot account via secure browser login. Opens a link to Riot\'s official login page.',
            },
            {
                name: '🛒 `/store`',
                value: 'View your daily store with skin images, featured bundle, and night market.\nRequires `/register` first.',
            },
            {
                name: '📋 `/accounts`',
                value: 'List all your registered Riot accounts and manage defaults.',
            },
            {
                name: '❓ `/help`',
                value: 'Show this help message.',
            },
        )
        .setFooter({ text: 'VLR Track • Data from HenrikDev & Riot APIs' })
        .setTimestamp();
}
