import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

import { data as statsData } from './commands/stats';
import { data as matchesData } from './commands/matches';
import { data as registerData } from './commands/register';
import { data as storeData } from './commands/store';
import { data as accountsData } from './commands/accounts';
import { data as helpData } from './commands/help';

const commands = [
    statsData.toJSON(),
    matchesData.toJSON(),
    registerData.toJSON(),
    storeData.toJSON(),
    accountsData.toJSON(),
    helpData.toJSON(),
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);

(async () => {
    try {
        console.log(`🔄 Registering ${commands.length} slash commands...`);

        await rest.put(
            Routes.applicationCommands(process.env.DISCORD_CLIENT_ID!),
            { body: commands },
        );

        console.log('✅ Slash commands registered successfully!');
    } catch (error) {
        console.error('❌ Error registering commands:', error);
    }
})();
