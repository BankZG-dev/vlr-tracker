const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

async function test() {
    try {
        const matches = await axios.get(`https://api.henrikdev.xyz/valorant/v3/matches/ap/Uncle%20Hope/diff?mode=competitive&size=2`, { headers: { 'Authorization': process.env.HENRIK_API_KEY }});
        const match = matches.data.data[0];
        console.log("Metadata keys:", Object.keys(match.metadata));
        console.log("Metadata:", JSON.stringify(match.metadata, null, 2));
    } catch (e) {
        console.error("Failed:", e.response?.data || e.message);
    }
}
test();
