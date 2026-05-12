import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { buildHelpEmbed } from '../utils/embeds';

export const data = new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show all available commands');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const embed = buildHelpEmbed();
    await interaction.reply({ embeds: [embed] });
}
