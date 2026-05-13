const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

async function test() {
    try {
        const matches = await axios.get(`https://api.henrikdev.xyz/valorant/v3/matches/ap/Uncle%20Hope/diff?mode=competitive&size=100`, { headers: { 'Authorization': process.env.HENRIK_API_KEY }});
        console.log(`Successfully fetched ${matches.data.data.length} matches`);
    } catch (e) {
        console.error("Failed:", e.response?.data || e.message);
    }
}
test();
