/**
 * Custom "Overall Rating" calculation.
 * 
 * Formula:
 *   ACS = score / rounds_played
 *   KD  = kills / deaths
 *   HS% = headshots / total_shots (0-1)
 *   DMG/Round = damage / rounds_played
 *   Win% = wins / total_games (0-1)
 * 
 *   Rating = (ACS * 0.35) + (KD * 100 * 0.25) + (HS% * 100 * 0.15) + (DMG/Round * 0.15) + (Win% * 100 * 0.10)
 * 
 * Scale:
 *   S+ = 280+   | S = 240-279 | A+ = 210-239 | A = 180-209
 *   B+ = 150-179 | B = 120-149 | C = 90-119   | D = 60-89 | F = 0-59
 */

export interface RatingInput {
    score: number;
    kills: number;
    deaths: number;
    headshots: number;
    bodyshots: number;
    legshots: number;
    damage: number;
    roundsPlayed: number;
    wins: number;
    totalGames: number;
}

export interface RatingResult {
    overall: number;
    grade: string;
    acs: number;
    kd: number;
    hsPercent: number;
    dmgPerRound: number;
    winPercent: number;
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

    const overall =
        (acs * 0.35) +
        (kd * 100 * 0.25) +
        (hsPercent * 100 * 0.15) +
        (dmgPerRound * 0.15) +
        (winPercent * 100 * 0.10);

    return {
        overall: Math.round(overall * 10) / 10,
        grade: getGrade(overall),
        acs: Math.round(acs * 10) / 10,
        kd: Math.round(kd * 100) / 100,
        hsPercent: Math.round(hsPercent * 1000) / 10,
        dmgPerRound: Math.round(dmgPerRound * 10) / 10,
        winPercent: Math.round(winPercent * 1000) / 10,
    };
}

function getGrade(rating: number): string {
    if (rating >= 280) return 'S+';
    if (rating >= 240) return 'S';
    if (rating >= 210) return 'A+';
    if (rating >= 180) return 'A';
    if (rating >= 150) return 'B+';
    if (rating >= 120) return 'B';
    if (rating >= 90) return 'C';
    if (rating >= 60) return 'D';
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
