import { Client, GatewayIntentBits, Events, MessageFlags } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

import { initDB } from './db/database';
import { execute as statsExecute } from './commands/stats';
import { execute as matchesExecute, handleMatchSelect } from './commands/matches';
import { execute as registerExecute, handleModal as registerHandleModal, handleUrlButton } from './commands/register';
import { execute as storeExecute } from './commands/store';
import { execute as accountsExecute } from './commands/accounts';
import { execute as helpExecute } from './commands/help';

// Initialize database
initDB();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
    ],
});

client.once(Events.ClientReady, (readyClient) => {
    console.log(`\n${'═'.repeat(50)}`);
    console.log(`  🎮 VLR Track Bot is online!`);
    console.log(`  👤 Logged in as ${readyClient.user.tag}`);
    console.log(`  📡 Serving ${readyClient.guilds.cache.size} guilds`);
    console.log(`${'═'.repeat(50)}\n`);
});

// Handle interactions
client.on(Events.InteractionCreate, async (interaction) => {
    try {
        // ─── Slash Commands ───
        if (interaction.isChatInputCommand()) {
            const { commandName } = interaction;

            switch (commandName) {
                case 'stats':
                    await statsExecute(interaction);
                    break;
                case 'matches':
                    await matchesExecute(interaction);
                    break;
                case 'register':
                    await registerExecute(interaction);
                    break;
                case 'store':
                    await storeExecute(interaction);
                    break;
                case 'accounts':
                    await accountsExecute(interaction);
                    break;
                case 'help':
                    await helpExecute(interaction);
                    break;
                default:
                    console.warn(`Unknown command: ${commandName}`);
            }
        }

        // ─── Button Interactions ───
        else if (interaction.isButton()) {
            if (interaction.customId === 'enter_redirect_url') {
                await handleUrlButton(interaction);
            }
        }

        // ─── Modal Submissions ───
        else if (interaction.isModalSubmit()) {
            if (interaction.customId === 'register_url_modal') {
                await registerHandleModal(interaction);
            }
        }

        // ─── Select Menu Interactions ───
        else if (interaction.isStringSelectMenu()) {
            if (interaction.customId === 'match_select') {
                await handleMatchSelect(interaction);
            }
        }

    } catch (error) {
        console.error('Interaction error:', error);

        // Try to respond with error
        try {
            const reply = { content: '❌ An unexpected error occurred.', flags: MessageFlags.Ephemeral as any };
            if (interaction.isRepliable()) {
                if (interaction.deferred || interaction.replied) {
                    await interaction.followUp(reply);
                } else {
                    await interaction.reply(reply);
                }
            }
        } catch { }
    }
});

// Login
client.login(process.env.DISCORD_TOKEN).catch((error) => {
    console.error('❌ Failed to login:', error.message);
    console.error('Make sure your DISCORD_TOKEN is correct in .env');
    process.exit(1);
});
