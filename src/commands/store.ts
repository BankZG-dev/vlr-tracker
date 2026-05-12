import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { getDefaultAccount, getAccountByName, getAllAccounts } from '../db/database';
import { getStorefront, getWallet } from '../api/riot-store';
import { reauthWithCookie } from '../api/riot-auth';
import { updateTokens } from '../db/database';
import { buildStoreEmbed } from '../utils/embeds';

export const data = new SlashCommandBuilder()
    .setName('store')
    .setDescription('View your Valorant daily store rotation')
    .addStringOption(option =>
        option.setName('account')
            .setDescription('Account name (if you have multiple registered accounts)')
            .setRequired(false)
    );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const accountName = interaction.options.getString('account');

    // Get the account
    let account;
    if (accountName) {
        // Try to find by name
        const parts = accountName.split('#');
        if (parts.length >= 2) {
            account = getAccountByName(interaction.user.id, parts[0], parts[1]);
        } else {
            // Search through all accounts
            const allAccounts = getAllAccounts(interaction.user.id);
            const found = allAccounts.find(a => a.riot_username.toLowerCase() === accountName.toLowerCase());
            if (found) {
                account = getAccountByName(interaction.user.id, found.riot_username, found.riot_tag);
            }
        }
    } else {
        account = getDefaultAccount(interaction.user.id);
    }

    if (!account) {
        await interaction.reply({
            content: '❌ No registered account found. Use `/register` first to link your Riot account.',
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    await interaction.deferReply();

    try {
        let accessToken = account.access_token;
        let entitlementToken = account.entitlement_token;

        // Check if tokens are expired
        const now = Math.floor(Date.now() / 1000);
        if (now >= account.expires_at) {
            // Try to re-auth with cookie
            if (account.ssid_cookie) {
                try {
                    const newAuth = await reauthWithCookie(account.ssid_cookie);
                    if (newAuth) {
                        accessToken = newAuth.access_token;
                        entitlementToken = newAuth.entitlement_token;
                        updateTokens(
                            interaction.user.id,
                            account.puuid,
                            newAuth.access_token,
                            newAuth.entitlement_token,
                            newAuth.ssid_cookie,
                            newAuth.expires_at
                        );
                    } else {
                        throw new Error('Cookie reauth failed');
                    }
                } catch {
                    await interaction.editReply({
                        content: '🔑 **Session expired.** Please use `/register` to log in again.',
                    });
                    return;
                }
            } else {
                await interaction.editReply({
                    content: '🔑 **Session expired.** Please use `/register` to log in again.',
                });
                return;
            }
        }

        // Fetch store and wallet
        const [storefront, wallet] = await Promise.all([
            getStorefront(account.shard, account.puuid, accessToken, entitlementToken),
            getWallet(account.shard, account.puuid, accessToken, entitlementToken),
        ]);

        const embeds = await buildStoreEmbed(
            storefront,
            wallet,
            account.riot_username,
            account.riot_tag
        );

        // Discord limit is 10 embeds per message.
        const chunkedEmbeds = [];
        for (let i = 0; i < embeds.length; i += 10) {
            chunkedEmbeds.push(embeds.slice(i, i + 10));
        }

        await interaction.editReply({ embeds: chunkedEmbeds[0] });

        for (let i = 1; i < chunkedEmbeds.length; i++) {
            await interaction.followUp({ embeds: chunkedEmbeds[i], ephemeral: false });
        }
    } catch (error: any) {
        console.error('Store error:', error?.response?.data || error);

        if (error?.response?.status === 400 || error?.response?.status === 401) {
            await interaction.editReply({
                content: '🔑 **Authentication expired.** Please use `/register` to log in again.',
            });
        } else {
            await interaction.editReply({
                content: `❌ **Error fetching store:** ${error.message || 'Unknown error'}`,
            });
        }
    }
}
