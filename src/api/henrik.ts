import axios from 'axios';
import { HenrikAccount, HenrikMMRData, HenrikMatchData } from '../types';

const BASE_URL = 'https://api.henrikdev.xyz';

function getHeaders() {
    const key = process.env.HENRIK_API_KEY;
    return key ? { Authorization: key } : {};
}

/** Get account info by Name#Tag */
export async function getAccount(name: string, tag: string): Promise<HenrikAccount> {
    const res = await axios.get(`${BASE_URL}/valorant/v1/account/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`, {
        headers: getHeaders(),
    });
    if (res.data.status !== 200) throw new Error(res.data.errors?.[0]?.message || 'Failed to fetch account');
    return res.data.data;
}

/** Get MMR data (current rank, seasonal stats) */
export async function getMMR(region: string, name: string, tag: string): Promise<HenrikMMRData> {
    const res = await axios.get(`${BASE_URL}/valorant/v3/mmr/${region}/pc/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`, {
        headers: getHeaders(),
    });
    if (res.data.status !== 200) throw new Error(res.data.errors?.[0]?.message || 'Failed to fetch MMR');
    return res.data.data;
}

/** Get last N competitive matches */
export async function getMatches(region: string, name: string, tag: string, size: number = 10): Promise<HenrikMatchData[]> {
    const res = await axios.get(`${BASE_URL}/valorant/v3/matches/${region}/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`, {
        headers: getHeaders(),
        params: { mode: 'competitive', size },
    });
    if (res.data.status !== 200) throw new Error(res.data.errors?.[0]?.message || 'Failed to fetch matches');
    return res.data.data;
}

/** Get a single match by ID */
export async function getMatchById(matchId: string): Promise<HenrikMatchData> {
    const res = await axios.get(`${BASE_URL}/valorant/v2/match/${matchId}`, {
        headers: getHeaders(),
    });
    if (res.data.status !== 200) throw new Error(res.data.errors?.[0]?.message || 'Failed to fetch match');
    return res.data.data;
}
