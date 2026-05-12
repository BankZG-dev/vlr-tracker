import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { getAllAccounts, setDefaultAccount, removeAccount } from '../db/database';

export const data = new SlashCommandBuilder()
    .setName('accounts')
    .setDescription('Manage your registered Riot accounts')
    .addSubcommand(sub =>
        sub.setName('list')
            .setDescription('List all your registered accounts')
    )
    .addSubcommand(sub =>
        sub.setName('default')
            .setDescription('Set your default account')
            .addStringOption(option =>
                option.setName('puuid')
                    .setDescription('PUUID of the account to set as default (from /accounts list)')
                    .setRequired(true)
            )
    )
    .addSubcommand(sub =>
        sub.setName('remove')
            .setDescription('Remove a registered account')
            .addStringOption(option =>
                option.setName('puuid')
                    .setDescription('PUUID of the account to remove (from /accounts list)')
                    .setRequired(true)
            )
    );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'list') {
        const accounts = getAllAccounts(interaction.user.id);

        if (accounts.length === 0) {
            await interaction.reply({
                content: '📭 No registered accounts. Use `/register` to link a Riot account.',
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const embed = new EmbedBuilder()
            .setColor(0xFF4654)
            .setTitle('📋 Your Registered Accounts')
            .setDescription(accounts.map((acc, i) => {
                const isDefault = acc.is_default ? ' ⭐ (default)' : '';
                const expired = Math.floor(Date.now() / 1000) >= acc.expires_at ? ' ⚠️ expired' : ' ✅';
                return `**${i + 1}.** ${acc.riot_username}#${acc.riot_tag}${isDefault}${expired}\n` +
                    `   🌍 ${acc.region} | PUUID: \`${acc.puuid.substring(0, 8)}...\``;
            }).join('\n\n'))
            .setFooter({ text: 'Use /accounts default or /accounts remove with the PUUID' });

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    else if (subcommand === 'default') {
        const puuid = interaction.options.getString('puuid', true);
        const success = setDefaultAccount(interaction.user.id, puuid);

        if (success) {
            await interaction.reply({ content: '✅ Default account updated!', flags: MessageFlags.Ephemeral });
        } else {
            await interaction.reply({ content: '❌ Account not found. Check the PUUID.', flags: MessageFlags.Ephemeral });
        }
    }

    else if (subcommand === 'remove') {
        const puuid = interaction.options.getString('puuid', true);
        const success = removeAccount(interaction.user.id, puuid);

        if (success) {
            await interaction.reply({ content: '🗑️ Account removed.', flags: MessageFlags.Ephemeral });
        } else {
            await interaction.reply({ content: '❌ Account not found. Check the PUUID.', flags: MessageFlags.Ephemeral });
        }
    }
}
