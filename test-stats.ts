declare var console: any;
import { getAccount, getMMR, getMatches } from './src/api/henrik';
import { calculateRating } from './src/utils/rating';

async function test() {
    console.log("Fetching account...");
    const account = await getAccount('Uncle Hope', 'diff');
    console.log("Account:", account.name, account.tag);

    console.log("Fetching matches...");
    try {
        const matches = await getMatches('ap', 'Uncle Hope', 'diff', 10);
        console.log(`Got ${matches.length} matches`);
        if (matches.length > 0) {
            const match = matches[0];
            const player = match.players.find(p => p.name.toLowerCase() === 'uncle hope' && p.tag.toLowerCase() === 'diff');
            console.log("Player found in match?", !!player);
            if (player) {
                console.log("Player stats:", player.stats);
            } else {
                console.log("Available players:");
                match.players.forEach(p => console.log(`- ${p.name}#${p.tag}`));
            }
        }
    } catch (e) {
        console.error("Match fetch failed:", e);
    }
}

test();
