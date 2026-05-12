import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { getAccount, getMMR, getMatches } from '../api/henrik';
import { buildProfileEmbed } from '../utils/embeds';
import { calculateRating, RatingInput } from '../utils/rating';
import { getDefaultAccount } from '../db/database';

export const data = new SlashCommandBuilder()
    .setName('stats')
    .setDescription('View Valorant ranked stats for a player')
    .addStringOption(option =>
        option.setName('name')
            .setDescription('Riot Name (e.g. PlayerName)')
            .setRequired(false)
    )
    .addStringOption(option =>
        option.setName('tag')
            .setDescription('Riot Tag (e.g. NA1)')
            .setRequired(false)
    )
    .addStringOption(option =>
        option.setName('region')
            .setDescription('Region')
            .setRequired(false)
            .addChoices(
                { name: 'Asia Pacific', value: 'ap' },
                { name: 'Europe', value: 'eu' },
                { name: 'North America', value: 'na' },
                { name: 'Korea', value: 'kr' },
                { name: 'Latin America', value: 'latam' },
                { name: 'Brazil', value: 'br' },
            )
    );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    let name = interaction.options.getString('name');
    let tag = interaction.options.getString('tag');
    let region = interaction.options.getString('region') || 'ap';

    // If no name/tag, try to use registered default
    if (!name || !tag) {
        const account = getDefaultAccount(interaction.user.id);
        if (account) {
            name = account.riot_username;
            tag = account.riot_tag;
            region = account.region;
        } else {
            await interaction.reply({
                content: '❌ Please provide a name and tag, or register an account first with `/register`.',
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

        // Fetch last 10 competitive matches for rating calculation
        const currentSeason = mmrData.seasonal?.[mmrData.seasonal.length - 1];
        let ratingInput: RatingInput = {
            score: 0, kills: 0, deaths: 0,
            headshots: 0, bodyshots: 0, legshots: 0,
            damage: 0, roundsPlayed: 0,
            wins: currentSeason?.wins ?? 0,
            totalGames: currentSeason?.games ?? 0,
        };

        try {
            const matches = await getMatches(region, name, tag, 10);
            
            for (const match of matches) {
                const player = match.players.all_players.find(p =>
                    p.name.toLowerCase() === name!.toLowerCase() &&
                    p.tag.toLowerCase() === tag!.toLowerCase()
                );
                if (!player) continue;

                const totalRounds = match.teams.red.rounds_won + match.teams.blue.rounds_won;
                ratingInput.score += player.stats.score;
                ratingInput.kills += player.stats.kills;
                ratingInput.deaths += player.stats.deaths;
                ratingInput.headshots += player.stats.headshots;
                ratingInput.bodyshots += player.stats.bodyshots;
                ratingInput.legshots += player.stats.legshots;
                ratingInput.damage += player.stats.damage.dealt;
                ratingInput.roundsPlayed += totalRounds;
            }
        } catch (e) {
            // Matches might fail due to rate limiting, still show profile
            console.warn('Could not fetch matches for rating calculation:', e);
        }

        const rating = calculateRating(ratingInput);
        const embed = await buildProfileEmbed(accountInfo, mmrData, rating);

        await interaction.editReply({ embeds: [embed] });
    } catch (error: any) {
        console.error('Stats error:', error);
        await interaction.editReply({
            content: `❌ **Error fetching stats:** ${error.message || 'Unknown error'}\n` +
                `Make sure the name and tag are correct (e.g. \`/stats name:PlayerName tag:NA1\`)`,
        });
    }
}
