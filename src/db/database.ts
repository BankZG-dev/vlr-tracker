import Database from 'better-sqlite3';
import path from 'path';
import { DBAccount } from '../types';
import { encrypt, decrypt } from '../utils/crypto';

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'vlr-track.db');

let db: Database.Database;

export function initDB(): void {
    const fs = require('fs');
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');

    db.exec(`
        CREATE TABLE IF NOT EXISTS accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            discord_id TEXT NOT NULL,
            riot_username TEXT NOT NULL,
            riot_tag TEXT NOT NULL,
            puuid TEXT NOT NULL,
            region TEXT NOT NULL,
            shard TEXT NOT NULL,
            access_token_encrypted TEXT NOT NULL,
            entitlement_token_encrypted TEXT NOT NULL,
            ssid_cookie_encrypted TEXT NOT NULL DEFAULT '',
            token_iv TEXT NOT NULL,
            token_auth_tag TEXT NOT NULL,
            ent_iv TEXT NOT NULL,
            ent_auth_tag TEXT NOT NULL,
            cookie_iv TEXT NOT NULL DEFAULT '',
            cookie_auth_tag TEXT NOT NULL DEFAULT '',
            expires_at INTEGER NOT NULL,
            created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            is_default INTEGER NOT NULL DEFAULT 0,
            UNIQUE(discord_id, puuid)
        );
    `);
}

export function saveAccount(
    discordId: string,
    riotUsername: string,
    riotTag: string,
    puuid: string,
    region: string,
    shard: string,
    accessToken: string,
    entitlementToken: string,
    ssidCookie: string,
    expiresAt: number
): void {
    const tokenEnc = encrypt(accessToken);
    const entEnc = encrypt(entitlementToken);
    const cookieEnc = ssidCookie ? encrypt(ssidCookie) : { encrypted: '', iv: '', authTag: '' };

    // Check if account already exists
    const existing = db.prepare('SELECT id FROM accounts WHERE discord_id = ? AND puuid = ?').get(discordId, puuid) as any;

    if (existing) {
        db.prepare(`
            UPDATE accounts SET
                riot_username = ?, riot_tag = ?, region = ?, shard = ?,
                access_token_encrypted = ?, entitlement_token_encrypted = ?, ssid_cookie_encrypted = ?,
                token_iv = ?, token_auth_tag = ?,
                ent_iv = ?, ent_auth_tag = ?,
                cookie_iv = ?, cookie_auth_tag = ?,
                expires_at = ?
            WHERE discord_id = ? AND puuid = ?
        `).run(
            riotUsername, riotTag, region, shard,
            tokenEnc.encrypted, entEnc.encrypted, cookieEnc.encrypted,
            tokenEnc.iv, tokenEnc.authTag,
            entEnc.iv, entEnc.authTag,
            cookieEnc.iv, cookieEnc.authTag,
            expiresAt,
            discordId, puuid
        );
    } else {
        // If this is the user's first account, make it default
        const existingAccounts = db.prepare('SELECT COUNT(*) as count FROM accounts WHERE discord_id = ?').get(discordId) as any;
        const isDefault = existingAccounts.count === 0 ? 1 : 0;

        db.prepare(`
            INSERT INTO accounts (discord_id, riot_username, riot_tag, puuid, region, shard,
                access_token_encrypted, entitlement_token_encrypted, ssid_cookie_encrypted,
                token_iv, token_auth_tag, ent_iv, ent_auth_tag, cookie_iv, cookie_auth_tag,
                expires_at, is_default)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            discordId, riotUsername, riotTag, puuid, region, shard,
            tokenEnc.encrypted, entEnc.encrypted, cookieEnc.encrypted,
            tokenEnc.iv, tokenEnc.authTag,
            entEnc.iv, entEnc.authTag,
            cookieEnc.iv, cookieEnc.authTag,
            expiresAt, isDefault
        );
    }
}

export function getDefaultAccount(discordId: string): (DBAccount & { access_token: string; entitlement_token: string; ssid_cookie: string }) | null {
    const row = db.prepare('SELECT * FROM accounts WHERE discord_id = ? AND is_default = 1').get(discordId) as DBAccount | undefined;
    if (!row) return null;
    return decryptAccount(row);
}

export function getAccountByName(discordId: string, username: string, tag: string): (DBAccount & { access_token: string; entitlement_token: string; ssid_cookie: string }) | null {
    const row = db.prepare('SELECT * FROM accounts WHERE discord_id = ? AND riot_username = ? AND riot_tag = ?')
        .get(discordId, username, tag) as DBAccount | undefined;
    if (!row) return null;
    return decryptAccount(row);
}

export function getAllAccounts(discordId: string): DBAccount[] {
    return db.prepare('SELECT * FROM accounts WHERE discord_id = ?').all(discordId) as DBAccount[];
}

export function setDefaultAccount(discordId: string, puuid: string): boolean {
    db.prepare('UPDATE accounts SET is_default = 0 WHERE discord_id = ?').run(discordId);
    const result = db.prepare('UPDATE accounts SET is_default = 1 WHERE discord_id = ? AND puuid = ?').run(discordId, puuid);
    return result.changes > 0;
}

export function removeAccount(discordId: string, puuid: string): boolean {
    const result = db.prepare('DELETE FROM accounts WHERE discord_id = ? AND puuid = ?').run(discordId, puuid);
    return result.changes > 0;
}

export function updateTokens(
    discordId: string,
    puuid: string,
    accessToken: string,
    entitlementToken: string,
    ssidCookie: string,
    expiresAt: number
): void {
    const tokenEnc = encrypt(accessToken);
    const entEnc = encrypt(entitlementToken);
    const cookieEnc = ssidCookie ? encrypt(ssidCookie) : { encrypted: '', iv: '', authTag: '' };

    db.prepare(`
        UPDATE accounts SET
            access_token_encrypted = ?, entitlement_token_encrypted = ?, ssid_cookie_encrypted = ?,
            token_iv = ?, token_auth_tag = ?,
            ent_iv = ?, ent_auth_tag = ?,
            cookie_iv = ?, cookie_auth_tag = ?,
            expires_at = ?
        WHERE discord_id = ? AND puuid = ?
    `).run(
        tokenEnc.encrypted, entEnc.encrypted, cookieEnc.encrypted,
        tokenEnc.iv, tokenEnc.authTag,
        entEnc.iv, entEnc.authTag,
        cookieEnc.iv, cookieEnc.authTag,
        expiresAt,
        discordId, puuid
    );
}

function decryptAccount(row: DBAccount) {
    let accessToken = '';
    let entitlementToken = '';
    let ssidCookie = '';

    try {
        accessToken = decrypt(row.access_token_encrypted, row.token_iv, row.token_auth_tag);
    } catch { }
    try {
        entitlementToken = decrypt(row.entitlement_token_encrypted, row.ent_iv, row.ent_auth_tag);
    } catch { }
    try {
        if (row.ssid_cookie_encrypted && row.cookie_iv && row.cookie_auth_tag) {
            ssidCookie = decrypt(row.ssid_cookie_encrypted, row.cookie_iv, row.cookie_auth_tag);
        }
    } catch { }

    return {
        ...row,
        access_token: accessToken,
        entitlement_token: entitlementToken,
        ssid_cookie: ssidCookie,
    };
}
