import { SlashCommandBuilder, ChatInputCommandInteraction, StringSelectMenuInteraction, MessageFlags } from 'discord.js';
import { getMatches } from '../api/henrik';
import { buildMatchListEmbed, buildMatchDetailEmbed } from '../utils/embeds';
import { getDefaultAccount } from '../db/database';
import { HenrikMatchData } from '../types';

// Cache matches in memory for interaction handling
const matchCache = new Map<string, HenrikMatchData[]>();

export const data = new SlashCommandBuilder()
    .setName('matches')
    .setDescription('View your last 10 ranked matches')
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
        const matches = await getMatches(region, name, tag, 10);

        if (matches.length === 0) {
            await interaction.editReply({ content: '❌ No competitive matches found for this player.' });
            return;
        }

        // Cache matches for dropdown interaction
        const cacheKey = `${interaction.user.id}_${name}_${tag}`;
        matchCache.set(cacheKey, matches);
        
        // Auto-cleanup cache after 10 minutes
        setTimeout(() => matchCache.delete(cacheKey), 600000);

        const { embed, selectMenu } = await buildMatchListEmbed(name, tag, matches);

        await interaction.editReply({
            embeds: [embed],
            components: [selectMenu],
        });
    } catch (error: any) {
        console.error('Matches error:', error);
        await interaction.editReply({
            content: `❌ **Error fetching matches:** ${error.message || 'Unknown error'}`,
        });
    }
}

export async function handleMatchSelect(interaction: StringSelectMenuInteraction): Promise<void> {
    const value = interaction.values[0];
    if (value === 'none') {
        await interaction.reply({ content: 'No match to display.', flags: MessageFlags.Ephemeral });
        return;
    }

    await interaction.deferReply();

    try {
        // Parse match_id and index from value
        const parts = value.split('_');
        const matchId = parts.slice(1, -1).join('_');
        const index = parseInt(parts[parts.length - 1]);

        // Try to find the match in cache
        let matchData: HenrikMatchData | null = null;

        // Search through cache
        for (const [, matches] of matchCache) {
            const found = matches[index];
            if (found && found.metadata.match_id === matchId) {
                matchData = found;
                break;
            }
            // Also search by match_id
            const byId = matches.find(m => m.metadata.match_id === matchId);
            if (byId) {
                matchData = byId;
                break;
            }
        }

        if (!matchData) {
            await interaction.editReply({ content: '❌ Match data expired. Please run `/matches` again.' });
            return;
        }

        // Find the searcher's puuid for highlighting
        const highlightPuuid = undefined; // We don't have it easily from the cache, skip highlighting

        const embeds = await buildMatchDetailEmbed(matchData, highlightPuuid);

        await interaction.editReply({ embeds });
    } catch (error: any) {
        console.error('Match detail error:', error);
        await interaction.editReply({
            content: `❌ **Error fetching match details:** ${error.message || 'Unknown error'}`,
        });
    }
}
