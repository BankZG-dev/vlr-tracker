import axios from 'axios';
import crypto from 'crypto';
import { REGION_TO_SHARD } from '../types';

const ENTITLEMENT_URL = 'https://entitlements.auth.riotgames.com/api/token/v1';
const USERINFO_URL = 'https://auth.riotgames.com/userinfo';
const GEO_URL = 'https://riot-geo.pas.si.riotgames.com/pas/v1/product/valorant';

export interface AuthResult {
    access_token: string;
    id_token: string;
    entitlement_token: string;
    puuid: string;
    region: string;
    shard: string;
    ssid_cookie: string;
    expires_at: number;
    game_name: string;
    tag_line: string;
}

export const LOGIN_URL = 'https://auth.riotgames.com/authorize?redirect_uri=https%3A%2F%2Fplayvalorant.com%2Fopt_in&client_id=play-valorant-web-prod&response_type=token%20id_token&nonce=1&scope=account%20openid';

export async function extractTokensFromUri(redirectUri: string, regionInput: string): Promise<AuthResult> {
    console.log('[Auth] Extracting tokens from provided URI...');
    
    // Parse tokens from URI fragment (https://playvalorant.com/opt_in#access_token=...&...)
    if (!redirectUri.includes('#')) {
        throw new Error('AUTH_FAILED: Invalid link. Make sure to copy the entire link after you log in.');
    }

    const fragment = redirectUri.split('#')[1] || '';
    const params = new URLSearchParams(fragment);

    const access_token = params.get('access_token');
    if (!access_token) {
        throw new Error('AUTH_FAILED: No access_token found in the link. Did you log in successfully?');
    }

    const id_token = params.get('id_token') || '';
    const expiresIn = parseInt(params.get('expires_in') || '3600');
    const expires_at = Math.floor(Date.now() / 1000) + expiresIn;

    const client = axios.create({
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${access_token}`
        }
    });

    console.log('[Auth] Getting entitlement token...');
    const entRes = await client.post(ENTITLEMENT_URL, {});

    const entitlement_token = entRes.data.entitlements_token;
    if (!entitlement_token) {
        throw new Error('AUTH_FAILED: No entitlement token returned');
    }

    console.log('[Auth] Getting user info...');
    const userinfoRes = await client.get(USERINFO_URL);

    const puuid = userinfoRes.data.sub;
    if (!puuid) {
        throw new Error('AUTH_FAILED: No PUUID in userinfo');
    }

    const gameName = userinfoRes.data.acct?.game_name || '';
    const tagLine = userinfoRes.data.acct?.tag_line || '';
    console.log('[Auth] Player:', gameName + '#' + tagLine, '| PUUID:', puuid.substring(0, 8) + '...');

    let region = regionInput.toLowerCase().trim();
    if (!['ap', 'na', 'eu', 'kr', 'latam', 'br'].includes(region)) {
        region = 'ap';
    }
    const shard = REGION_TO_SHARD[region] || region;

    console.log('[Auth] ✅ URI Authentication complete!');

    return {
        access_token,
        id_token,
        entitlement_token,
        puuid,
        region,
        shard,
        ssid_cookie: '', // Not used in this flow, token refresh will just require new login
        expires_at,
        game_name: gameName,
        tag_line: tagLine,
    };
}

export async function reauthWithCookie(ssidCookie: string): Promise<AuthResult | null> {
    return null;
}
