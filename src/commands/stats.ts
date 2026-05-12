import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { getAccount, getMMR, getMatches } from '../api/henrik';
import { buildProfileEmbed } from '../utils/embeds';
import { calculateRating, RatingInput } from '../utils/rating';
import { getDefaultAccount } from '../db/database';

export const data = new SlashCommandBuilder()
    .setName('stats')
    .setDescription('View Valorant ranked stats for a player')
    .addStringOption(option =>
        option.setName('player')
            .setDescription('In-game Name#Tag (e.g. Uncle Hope#diff)')
            .setRequired(false)
    );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const playerInput = interaction.options.getString('player');
    let name: string | null = null;
    let tag: string | null = null;
    let region = 'ap';

    if (playerInput) {
        // Parse "Name#Tag" format
        const parts = playerInput.split('#');
        if (parts.length < 2 || !parts[0].trim() || !parts[1].trim()) {
            await interaction.reply({
                content: '❌ Please use the format `Name#Tag` (e.g. `Uncle Hope#diff`)',
                flags: MessageFlags.Ephemeral,
            });
            return;
        }
        name = parts[0].trim();
        tag = parts[1].trim();
    } else {
        // No input = use registered default account
        const account = getDefaultAccount(interaction.user.id);
        if (account) {
            name = account.riot_username;
            tag = account.riot_tag;
            region = account.region;
        } else {
            await interaction.reply({
                content: '❌ No player specified. Either:\n' +
                    '• `/stats player:Uncle Hope#diff`\n' +
                    '• Or register your account first with `/register` to use `/stats` without arguments.',
                flags: MessageFlags.Ephemeral,
            });
            return;
        }
    }

    await interaction.deferReply();

    try {
        // Fetch account info
        const accountInfo = await getAccount(name, tag);
        region = accountInfo.region || region;

        // Fetch MMR data
        const mmrData = await getMMR(region, name, tag);

        // Get current season info from MMR data
        const currentSeason = mmrData.seasonal?.[mmrData.seasonal.length - 1];
        const seasonName = currentSeason?.season?.short || 'Unknown';
        // Convert season short (e.g. "e11a3") to readable format (e.g. "Episode 11 Act 3")
        const seasonDisplay = formatSeasonName(seasonName);

        let ratingInput: RatingInput = {
            score: 0, kills: 0, deaths: 0, assists: 0,
            headshots: 0, bodyshots: 0, legshots: 0,
            damage: 0, roundsPlayed: 0,
            wins: currentSeason?.wins ?? 0,
            totalGames: currentSeason?.games ?? 0,
        };

        try {
            // Fetch more matches and filter to current season only
            const totalGames = currentSeason?.games ?? 10;
            const fetchSize = Math.min(totalGames, 20); // Fetch up to 20 matches
            const matches = await getMatches(region, name, tag, fetchSize);
            
            // Get the season_id from the most recent match to identify current season
            const currentSeasonId = matches.length > 0 ? matches[0].metadata.season_id : null;

            for (const match of matches) {
                // Only include matches from the current season
                if (currentSeasonId && match.metadata.season_id !== currentSeasonId) continue;

                const player = match.players.all_players.find(p =>
                    p.name.toLowerCase() === name!.toLowerCase() &&
                    p.tag.toLowerCase() === tag!.toLowerCase()
                );
                if (!player) continue;

                const totalRounds = match.teams.red.rounds_won + match.teams.blue.rounds_won;
                ratingInput.score += player.stats.score;
                ratingInput.kills += player.stats.kills;
                ratingInput.deaths += player.stats.deaths;
                ratingInput.assists += player.stats.assists;
                ratingInput.headshots += player.stats.headshots;
                ratingInput.bodyshots += player.stats.bodyshots;
                ratingInput.legshots += player.stats.legshots;
                ratingInput.damage += player.damage_made;
                ratingInput.roundsPlayed += totalRounds;
            }
        } catch (e) {
            // Matches might fail due to rate limiting, still show profile
            console.warn('Could not fetch matches for rating calculation:', e);
        }

        const rating = calculateRating(ratingInput);
        const embed = await buildProfileEmbed(accountInfo, mmrData, rating, seasonDisplay);

        await interaction.editReply({ embeds: [embed] });
    } catch (error: any) {
        console.error('Stats error:', error);
        await interaction.editReply({
            content: `❌ **Error fetching stats:** ${error.message || 'Unknown error'}\n` +
                `Make sure you use the correct **in-game name and tag** (e.g. \`Uncle Hope#diff\`), not your login username.`,
        });
    }
}

/** Convert season short code to readable format */
function formatSeasonName(short: string): string {
    // e.g. "e11a3" -> "Episode 11 Act 3"
    const match = short.match(/e(\d+)a(\d+)/);
    if (match) {
        return `Episode ${match[1]} Act ${match[2]}`;
    }
    return short;
}
