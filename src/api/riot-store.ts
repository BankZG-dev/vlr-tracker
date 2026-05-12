import axios from 'axios';
import { StorefrontResponse, CLIENT_PLATFORM } from '../types';

const VALORANT_API_VERSION_URL = 'https://valorant-api.com/v1/version';

let cachedClientVersion: string | null = null;
let clientVersionExpiry = 0;

/** Get current Valorant client version from valorant-api.com */
async function getClientVersion(): Promise<string> {
    if (cachedClientVersion && Date.now() < clientVersionExpiry) {
        return cachedClientVersion;
    }

    const res = await axios.get(VALORANT_API_VERSION_URL);
    cachedClientVersion = res.data.data.riotClientVersion;
    clientVersionExpiry = Date.now() + 3600000; // cache 1 hour
    return cachedClientVersion!;
}

/** Get the player's current store (daily rotation + night market) */
export async function getStorefront(
    shard: string,
    puuid: string,
    accessToken: string,
    entitlementToken: string
): Promise<StorefrontResponse> {
    const clientVersion = await getClientVersion();

    const res = await axios.get(
        `https://pd.${shard}.a.pvp.net/store/v2/storefront/${puuid}`,
        {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'X-Riot-Entitlements-JWT': entitlementToken,
                'X-Riot-ClientPlatform': CLIENT_PLATFORM,
                'X-Riot-ClientVersion': clientVersion,
            },
        }
    );

    return res.data;
}

/** Get wallet balance (VP + RP) */
export async function getWallet(
    shard: string,
    puuid: string,
    accessToken: string,
    entitlementToken: string
): Promise<Record<string, number>> {
    const res = await axios.get(
        `https://pd.${shard}.a.pvp.net/store/v1/wallet/${puuid}`,
        {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'X-Riot-Entitlements-JWT': entitlementToken,
                'X-Riot-ClientPlatform': CLIENT_PLATFORM,
            },
        }
    );

    return res.data.Balances;
}
