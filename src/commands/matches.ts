import { SlashCommandBuilder, ChatInputCommandInteraction, StringSelectMenuInteraction, MessageFlags } from 'discord.js';
import { getMatches } from '../api/henrik';
import { buildMatchListEmbed, buildMatchDetailEmbed } from '../utils/embeds';
import { getDefaultAccount } from '../db/database';
import { HenrikMatchData } from '../types';

// Cache matches in memory for interaction handling
const matchCache = new Map<string, HenrikMatchData[]>();

export const data = new SlashCommandBuilder()
    .setName('matches')
    .setDescription('View your last 5 ranked matches')
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
        const account = getDefaultAccount(interaction.user.id);
        if (account) {
            name = account.riot_username;
            tag = account.riot_tag;
            region = account.region;
        } else {
            await interaction.reply({
                content: '❌ No player specified. Either:\n' +
                    '• `/matches player:Uncle Hope#diff`\n' +
                    '• Or register your account first with `/register`',
                flags: MessageFlags.Ephemeral,
            });
            return;
        }
    }

    await interaction.deferReply();

    try {
        const matches = await getMatches(region, name, tag, 5);

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
            if (found && found.metadata.matchid === matchId) {
                matchData = found;
                break;
            }
            // Also search by match_id
            const byId = matches.find(m => m.metadata.matchid === matchId);
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
