import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    ModalSubmitInteraction,
    MessageFlags,
    ButtonBuilder,
    ButtonStyle,
    ButtonInteraction
} from 'discord.js';
import { extractTokensFromUri, LOGIN_URL } from '../api/riot-auth';
import { saveAccount } from '../db/database';

export const data = new SlashCommandBuilder()
    .setName('register')
    .setDescription('Register your Riot account to access store features');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const loginButton = new ButtonBuilder()
        .setLabel('1. Login to Riot')
        .setURL(LOGIN_URL)
        .setStyle(ButtonStyle.Link);

    const submitButton = new ButtonBuilder()
        .setCustomId('enter_redirect_url')
        .setLabel('2. I logged in, submit URL')
        .setEmoji('🔗')
        .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(loginButton, submitButton);

    await interaction.reply({
        content: `**Secure Login Flow (Bypasses Captchas/Cloudflare)**\n\n` +
                 `1️⃣ Click **Login to Riot** and sign in on your browser.\n` +
                 `2️⃣ The page will look like it's broken/blank. **Copy the entire URL from the address bar** (it starts with \`https://playvalorant.com/opt_in#...\`).\n` +
                 `3️⃣ Click **I logged in**, paste the URL, and type your region!`,
        components: [row] as any,
        flags: MessageFlags.Ephemeral
    });
}

// Shows the modal when the user clicks the "Submit URL" button
export async function handleUrlButton(interaction: ButtonInteraction): Promise<void> {
    const modal = new ModalBuilder()
        .setCustomId('register_url_modal')
        .setTitle('🔗 Paste Redirect URL');

    const urlInput = new TextInputBuilder()
        .setCustomId('riot_redirect_url')
        .setLabel('Paste the URL here')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('https://playvalorant.com/opt_in#access_token=...')
        .setRequired(true);

    const regionInput = new TextInputBuilder()
        .setCustomId('riot_region')
        .setLabel('Region (ap, na, eu, kr, latam, br)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('ap')
        .setValue('ap')
        .setRequired(true);

    modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(urlInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(regionInput),
    );
    
    await interaction.showModal(modal);
}

// Handles the modal submission
export async function handleModal(interaction: ModalSubmitInteraction): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const redirectUri = interaction.fields.getTextInputValue('riot_redirect_url');
    const region = interaction.fields.getTextInputValue('riot_region');

    try {
        const result = await extractTokensFromUri(redirectUri, region);

        saveAccount(
            interaction.user.id,
            result.game_name || 'Unknown',
            result.tag_line || '', 
            result.puuid,
            result.region,
            result.shard,
            result.access_token,
            result.entitlement_token,
            result.ssid_cookie,
            result.expires_at
        );

        await interaction.editReply({
            content: `✅ **Account registered successfully!**\n` +
                `👤 PUUID: \`${result.puuid.substring(0, 8)}...\`\n` +
                `🌍 Region: **${result.region}** | Shard: **${result.shard}**\n` +
                `⏱️ Token expires: <t:${result.expires_at}:R>\n\n` +
                `You can now use \`/store\` to check your daily store!`,
        });
    } catch (error: any) {
        console.error('[Register] Auth error:', error.message);
        
        let errorMsg = 'Unknown error occurred.';
        if (error.message?.includes('AUTH_FAILED')) {
            errorMsg = `❌ **Authentication Failed**\n${error.message.replace('AUTH_FAILED: ', '')}\n\n` +
                `Make sure you copied the **ENTIRE** URL from your browser address bar after logging in.`;
        } else {
            errorMsg = `❌ **Error:** ${error.message}`;
        }

        await interaction.editReply({ content: errorMsg });
    }
}
