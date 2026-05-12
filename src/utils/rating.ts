/**
 * VLR.gg-style Rating Calculation
 * 
 * The real VLR rating uses round-by-round context (player differential, 
 * economy, trades) which requires granular round data we don't have.
 * 
 * This is an approximation that produces similar 0.5-1.5 scale ratings
 * based on publicly available per-match stats:
 * 
 *   Components (all per-round):
 *     - Kill contribution:     kills_per_round * 0.33
 *     - Survival contribution: (1 - deaths_per_round) * 0.20
 *     - Damage contribution:   (damage_per_round / 150) * 0.28
 *     - Assist contribution:   assists_per_round * 0.10
 *     - HS contribution:       hs_percent * 0.09
 * 
 *   Average performance = 1.0 rating
 *   Top fraggers typically get 1.3-1.5
 *   Struggling players drop to 0.5-0.7
 */

export interface RatingInput {
    score: number;
    kills: number;
    deaths: number;
    assists: number;
    headshots: number;
    bodyshots: number;
    legshots: number;
    damage: number;
    roundsPlayed: number;
    wins: number;
    totalGames: number;
}

export interface RatingResult {
    overall: number;   // VLR-style 0.0-2.0 scale
    grade: string;     // Letter grade
    acs: number;
    kd: number;
    hsPercent: number;
    dmgPerRound: number;
    winPercent: number;
    killsPerRound: number;
    assistsPerRound: number;
}

export function calculateRating(input: RatingInput): RatingResult {
    const roundsPlayed = Math.max(input.roundsPlayed, 1);
    const deaths = Math.max(input.deaths, 1);
    const totalShots = input.headshots + input.bodyshots + input.legshots;
    const totalGames = Math.max(input.totalGames, 1);

    const acs = input.score / roundsPlayed;
    const kd = input.kills / deaths;
    const hsPercent = totalShots > 0 ? input.headshots / totalShots : 0;
    const dmgPerRound = input.damage / roundsPlayed;
    const winPercent = input.wins / totalGames;
    const killsPerRound = input.kills / roundsPlayed;
    const deathsPerRound = input.deaths / roundsPlayed;
    const assistsPerRound = (input.assists ?? 0) / roundsPlayed;

    // VLR-style rating components (tuned to hover around 1.0 for average play)
    const killComponent = killsPerRound * 0.33 / 0.20;        // avg ~0.8 kills/round -> 1.32
    const survivalComponent = (1 - Math.min(deathsPerRound, 1)) * 0.20 / 0.15; // survive bonus
    const damageComponent = (dmgPerRound / 150) * 0.28 / 0.28; // 150 dmg/round = average
    const assistComponent = assistsPerRound * 0.10 / 0.04;     // avg ~0.2 assists/round
    const hsComponent = hsPercent * 0.09 / 0.07;               // 25% HS = average

    // Weighted sum, calibrated so average performance ≈ 1.0
    const rawRating = (killComponent * 0.33) +
                      (survivalComponent * 0.20) +
                      (damageComponent * 0.28) +
                      (assistComponent * 0.10) +
                      (hsComponent * 0.09);

    // Clamp to reasonable range
    const rating = Math.max(0, Math.min(2.5, rawRating));

    return {
        overall: Math.round(rating * 100) / 100,
        grade: getGrade(rating),
        acs: Math.round(acs * 10) / 10,
        kd: Math.round(kd * 100) / 100,
        hsPercent: Math.round(hsPercent * 1000) / 10,
        dmgPerRound: Math.round(dmgPerRound * 10) / 10,
        winPercent: Math.round(winPercent * 1000) / 10,
        killsPerRound: Math.round(killsPerRound * 100) / 100,
        assistsPerRound: Math.round(assistsPerRound * 100) / 100,
    };
}

function getGrade(rating: number): string {
    if (rating >= 1.40) return 'S+';
    if (rating >= 1.25) return 'S';
    if (rating >= 1.15) return 'A+';
    if (rating >= 1.05) return 'A';
    if (rating >= 0.95) return 'B+';
    if (rating >= 0.85) return 'B';
    if (rating >= 0.70) return 'C';
    if (rating >= 0.50) return 'D';
    return 'F';
}

export function getGradeColor(grade: string): number {
    const colors: Record<string, number> = {
        'S+': 0xFFD700, // Gold
        'S': 0xFFA500,  // Orange
        'A+': 0xFF4500, // Red-Orange
        'A': 0xDC143C,  // Crimson
        'B+': 0x9370DB, // Medium Purple
        'B': 0x6A5ACD,  // Slate Blue
        'C': 0x4169E1,  // Royal Blue
        'D': 0x708090,  // Slate Gray
        'F': 0x696969,  // Dim Gray
    };
    return colors[grade] ?? 0x808080;
}

/** Get a rank color based on tier ID */
export function getRankColor(tierId: number): number {
    if (tierId >= 24) return 0xFFFB8B; // Radiant/Immortal - Yellow
    if (tierId >= 21) return 0xDC3D4B; // Immortal - Red
    if (tierId >= 18) return 0x9C59D1; // Ascendant - Purple
    if (tierId >= 15) return 0x59A9D1; // Diamond - Blue
    if (tierId >= 12) return 0xD1B459; // Platinum - Gold/Teal
    if (tierId >= 9) return 0xB4D459;  // Gold - Yellow-green
    if (tierId >= 6) return 0xD5D856;  // Silver - Light gold
    if (tierId >= 3) return 0x8F8F8F;  // Iron - Gray
    return 0x666666;
}
