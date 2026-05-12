import axios from 'axios';
import { ValorantSkin, CompetitiveTier } from '../types';

const BASE_URL = 'https://valorant-api.com/v1';

// ─── In-memory caches ───
let skinCache: Map<string, ValorantSkin> = new Map();
let skinLevelCache: Map<string, { displayName: string; displayIcon: string | null }> = new Map();
let tierCache: Map<number, CompetitiveTier> = new Map();
let bundleCache: Map<string, { displayName: string; displayIcon: string | null }> = new Map();
let cacheExpiry = 0;

/** Load all skins into cache */
async function loadSkins(): Promise<void> {
    const res = await axios.get(`${BASE_URL}/weapons/skins?language=en-US`);
    skinCache.clear();
    skinLevelCache.clear();

    for (const skin of res.data.data) {
        skinCache.set(skin.uuid, skin);
        // Also cache individual levels
        if (skin.levels) {
            for (const level of skin.levels) {
                skinLevelCache.set(level.uuid, {
                    displayName: level.displayName || skin.displayName,
                    displayIcon: level.displayIcon || skin.displayIcon,
                });
            }
        }
    }
}

/** Load competitive tiers into cache */
async function loadTiers(): Promise<void> {
    const res = await axios.get(`${BASE_URL}/competitivetiers?language=en-US`);
    tierCache.clear();

    // Get the latest tier set (last in the array)
    const latestTierSet = res.data.data[res.data.data.length - 1];
    if (latestTierSet?.tiers) {
        for (const tier of latestTierSet.tiers) {
            tierCache.set(tier.tier, tier);
        }
    }
}

/** Load bundles into cache */
async function loadBundles(): Promise<void> {
    const res = await axios.get(`${BASE_URL}/bundles?language=en-US`);
    bundleCache.clear();

    for (const bundle of res.data.data) {
        bundleCache.set(bundle.uuid, {
            displayName: bundle.displayName,
            displayIcon: bundle.displayIcon,
        });
    }
}

/** Ensure caches are loaded */
async function ensureCache(): Promise<void> {
    if (Date.now() < cacheExpiry) return;

    await Promise.all([loadSkins(), loadTiers(), loadBundles()]);
    cacheExpiry = Date.now() + 3600000; // 1 hour cache
}

/** Get skin info by UUID (skin level UUID from store offers) */
export async function getSkinByLevelUUID(uuid: string): Promise<{ displayName: string; displayIcon: string | null }> {
    await ensureCache();
    return skinLevelCache.get(uuid) || { displayName: 'Unknown Skin', displayIcon: null };
}

/** Get skin info by skin UUID */
export async function getSkinByUUID(uuid: string): Promise<ValorantSkin | undefined> {
    await ensureCache();
    return skinCache.get(uuid);
}

/** Get competitive tier info */
export async function getTierInfo(tierId: number): Promise<CompetitiveTier | undefined> {
    await ensureCache();
    return tierCache.get(tierId);
}

/** Get rank icon URL */
export async function getRankIcon(tierId: number): Promise<string | null> {
    const tier = await getTierInfo(tierId);
    return tier?.largeIcon || tier?.smallIcon || null;
}

/** Get rank name */
export async function getRankName(tierId: number): Promise<string> {
    const tier = await getTierInfo(tierId);
    return tier?.tierName || 'Unranked';
}

/** Get bundle info by UUID */
export async function getBundleInfo(uuid: string): Promise<{ displayName: string; displayIcon: string | null }> {
    await ensureCache();
    return bundleCache.get(uuid) || { displayName: 'Unknown Bundle', displayIcon: null };
}
