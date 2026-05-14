// ─── HenrikDev API Types ───

export interface HenrikAccount {
    puuid: string;
    region: string;
    account_level: number;
    name: string;
    tag: string;
    card: {
        small: string;
        large: string;
        wide: string;
        id: string;
    };
}

export interface HenrikMMRData {
    current: {
        tier: {
            id: number;
            name: string;
        };
        rr: number;
        last_change: number;
        elo: number;
    };
    highest: {
        tier: {
            id: number;
            name: string;
        };
        season: string;
        act_patched: string;
    };
    seasonal: SeasonalData[];
}

export interface SeasonalData {
    season: {
        short: string;
    };
    act_rank_wins: ActRankWin[];
    wins: number;
    games: number;
    end_tier: {
        id: number;
        name: string;
    };
}

export interface ActRankWin {
    tier: number;
    games: number;
}

// ─── Match Types ───

export interface HenrikMatchData {
    metadata: {
        map: string;
        game_version: string;
        game_length: number;
        game_start: number;
        game_start_patched: string;
        rounds_played: number;
        mode: string;
        mode_id: string;
        queue: string;
        season_id: string;
        platform: string;
        matchid: string;
        region: string;
        cluster: string;
    };
    players: {
        all_players: MatchPlayer[];
        red: MatchPlayer[];
        blue: MatchPlayer[];
    };
    teams: {
        red: MatchTeam;
        blue: MatchTeam;
    };
    rounds: MatchRound[];
}

export interface MatchPlayer {
    puuid: string;
    name: string;
    tag: string;
    team: string;
    agent: {
        id: string;
        name: string;
    };
    tier: {
        id: number;
        name: string;
    };
    stats: {
        score: number;
        kills: number;
        deaths: number;
        assists: number;
        headshots: number;
        bodyshots: number;
        legshots: number;
    };
    damage_made: number;
    damage_received: number;
    ability_casts: {
        grenade: number;
        ability1: number;
        ability2: number;
        ultimate: number;
    };
    economy: {
        spent: {
            overall: number;
            average: number;
        };
        loadout_value: {
            overall: number;
            average: number;
        };
    };
}

export interface MatchTeam {
    has_won: boolean;
    rounds_won: number;
    rounds_lost: number;
    roster: any;
}

export interface MatchRound {
    id: number;
    result: string;
    ceremony: string;
    winning_team: string;
}

export interface RiotMatchlistDto {
    puuid: string;
    history: RiotMatchlistEntryDto[];
}

export interface RiotMatchlistEntryDto {
    matchId: string;
    gameStartTimeMillis: number;
    queueId: string;
}

// ─── Riot Internal Auth Types ───

export interface RiotAuthTokens {
    access_token: string;
    entitlement_token: string;
    puuid: string;
    shard: string;
    region: string;
    expires_at: number; // timestamp
}

// ─── Storefront Types ───

export interface StorefrontResponse {
    FeaturedBundle: {
        Bundle: StorefrontBundle;
        Bundles: StorefrontBundle[];
        BundleRemainingDurationInSeconds: number;
    };
    SkinsPanelLayout: {
        SingleItemOffers: string[];
        SingleItemStoreOffers: StoreOffer[];
        SingleItemOffersRemainingDurationInSeconds: number;
    };
    UpgradeCurrencyStore: {
        UpgradeCurrencyOffers: any[];
    };
    AccessoryStore: {
        AccessoryStoreOffers: any[];
        AccessoryStoreRemainingDurationInSeconds: number;
        StorefrontID: string;
    };
    BonusStore?: {
        BonusStoreOffers: BonusOffer[];
        BonusStoreRemainingDurationInSeconds: number;
    };
}

export interface StorefrontBundle {
    ID: string;
    DataAssetID: string;
    CurrencyID: string;
    Items: BundleItem[];
    TotalBaseCost: Record<string, number> | null;
    TotalDiscountedCost: Record<string, number> | null;
    TotalDiscountPercent: number;
    DurationRemainingInSeconds: number;
    WholesaleOnly: boolean;
}

export interface BundleItem {
    Item: {
        ItemTypeID: string;
        ItemID: string;
        Amount: number;
    };
    BasePrice: number;
    CurrencyID: string;
    DiscountPercent: number;
    DiscountedPrice: number;
    IsPromoItem: boolean;
}

export interface StoreOffer {
    OfferID: string;
    IsDirectPurchase: boolean;
    StartDate: string;
    Cost: Record<string, number>;
    Rewards: {
        ItemTypeID: string;
        ItemID: string;
        Quantity: number;
    }[];
}

export interface BonusOffer {
    BonusOfferID: string;
    Offer: StoreOffer;
    DiscountPercent: number;
    DiscountCosts: Record<string, number>;
    IsSeen: boolean;
}

// ─── valorant-api.com Types ───

export interface ValorantSkin {
    uuid: string;
    displayName: string;
    displayIcon: string | null;
    fullRender: string | null;
    levels: {
        uuid: string;
        displayName: string;
        displayIcon: string | null;
    }[];
    chromas: {
        uuid: string;
        displayName: string;
        displayIcon: string | null;
        fullRender: string | null;
    }[];
}

export interface CompetitiveTier {
    tier: number;
    tierName: string;
    division: string;
    color: string;
    backgroundColor: string;
    smallIcon: string | null;
    largeIcon: string | null;
    rankTriangleDownIcon: string | null;
    rankTriangleUpIcon: string | null;
}

// ─── Database Types ───

export interface DBAccount {
    id: number;
    discord_id: string;
    riot_username: string;
    riot_tag: string;
    puuid: string;
    region: string;
    shard: string;
    access_token_encrypted: string;
    entitlement_token_encrypted: string;
    ssid_cookie_encrypted: string;
    token_iv: string;
    token_auth_tag: string;
    ent_iv: string;
    ent_auth_tag: string;
    cookie_iv: string;
    cookie_auth_tag: string;
    expires_at: number;
    created_at: number;
    is_default: number;
}

// ─── Region/Shard mapping ───

export const REGION_TO_SHARD: Record<string, string> = {
    na: 'na',
    latam: 'na',
    br: 'na',
    eu: 'eu',
    ap: 'ap',
    kr: 'kr',
    pbe: 'pbe',
};

export const REGION_TO_RIOT_ROUTING: Record<string, string> = {
    na: 'americas',
    latam: 'americas',
    br: 'americas',
    eu: 'europe',
    ap: 'asia',
    kr: 'asia',
    pbe: 'americas',
};

export const SHARD_LIST = ['na', 'eu', 'ap', 'kr', 'pbe'] as const;
export const REGION_LIST = ['na', 'eu', 'ap', 'kr', 'latam', 'br'] as const;

// ─── VP Currency ID ───
export const VP_CURRENCY_ID = '85ad13f7-3d1b-5128-9eb2-7cd8ee0b5741';
export const RP_CURRENCY_ID = 'e59aa87c-4cbf-517a-5983-6e81511be9b7';

// ─── Client Platform (base64) ───
export const CLIENT_PLATFORM = 'ew0KCSJwbGF0Zm9ybVR5cGUiOiAiUEMiLA0KCSJwbGF0Zm9ybU9TIjogIldpbmRvd3MiLA0KCSJwbGF0Zm9ybU9TVmVyc2lvbiI6ICIxMC4wLjE5MDQyLjEuMjU2LjY0Yml0IiwNCgkicGxhdGZvcm1DaGlwc2V0IjogIlVua25vd24iDQp9';
