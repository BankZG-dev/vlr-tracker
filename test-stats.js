const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

async function test() {
    try {
        const res = await axios.get(`https://api.henrikdev.xyz/valorant/v3/mmr/ap/pc/Uncle%20Hope/diff`, { headers: { 'Authorization': process.env.HENRIK_API_KEY }});
        console.log("Current MMR Tier:", res.data.data.current.tier.name);
        console.log("Seasonal length:", res.data.data.seasonal.length);
        if (res.data.data.seasonal.length > 0) {
            console.log("Season 0:", res.data.data.seasonal[0].season.short, "Wins:", res.data.data.seasonal[0].wins, "Games:", res.data.data.seasonal[0].games);
            console.log("Season 1:", res.data.data.seasonal[1]?.season?.short, "Wins:", res.data.data.seasonal[1]?.wins, "Games:", res.data.data.seasonal[1]?.games);
        }
    } catch (e) {
        console.error("MMR fetch failed:", e.response?.data || e.message);
    }
}
test();
