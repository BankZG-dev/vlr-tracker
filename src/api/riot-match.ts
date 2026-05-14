import axios from 'axios';
import { RiotMatchlistDto, RiotMatchlistEntryDto, REGION_TO_RIOT_ROUTING } from '../types';

const RIOT_API_TOKEN = process.env.RIOT_API_KEY;

function getRiotRouting(region: string): string {
    const lower = region.toLowerCase();
    const routing = REGION_TO_RIOT_ROUTING[lower];
    if (!routing) {
        throw new Error(`Unsupported region for Riot API routing: ${region}`);
    }
    return routing;
}

function getRiotAuthHeaders() {
    if (!RIOT_API_TOKEN) {
        throw new Error('RIOT_API_KEY is not configured. Set RIOT_API_KEY in your environment.');
    }
    return {
        'X-Riot-Token': RIOT_API_TOKEN,
        'Content-Type': 'application/json',
    };
}

export async function getMatchlistByPuuid(region: string, puuid: string): Promise<RiotMatchlistDto> {
    const routing = getRiotRouting(region);
    const url = `https://${routing}.api.riotgames.com/val/match/v1/matchlists/by-puuid/${encodeURIComponent(puuid)}`;
    const res = await axios.get(url, {
        headers: getRiotAuthHeaders(),
    });
    return res.data as RiotMatchlistDto;
}

export async function getMatchCountByPuuid(region: string, puuid: string): Promise<number> {
    const matchlist = await getMatchlistByPuuid(region, puuid);
    return matchlist.history?.length ?? 0;
}

export async function getMatchIdsByPuuid(region: string, puuid: string): Promise<string[]> {
    const matchlist = await getMatchlistByPuuid(region, puuid);
    return matchlist.history?.map((entry: RiotMatchlistEntryDto) => entry.matchId) ?? [];
}
