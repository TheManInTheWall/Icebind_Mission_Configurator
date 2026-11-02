import { SheetWeights } from '../data/sheetData';

export type ScoringMode = 'mission-first' | 'combined';

export interface SquadUser {
  id: string;
  name: string;
  inSquad: boolean;
}

export interface UserMission {
  id: string;
  userId: string;
  missionName: string;
  setting1?: string;
  setting2?: string;
  consumedRunNumber?: number;
  createdAt: number;
}

export interface ScoredMission {
  mission: UserMission;
  user: SquadUser;
  baseScore: number;
  setting1Score: number | null;
  setting2Score: number | null;
  bindsKnownSum: number;
  bindsCount: number;
  knownTotal: number;
  /** Used for fair tie-breaking/combined ranking when some missions don't have binds entered yet */
  effectiveCombined: number;
  effectiveBindsTieBreaker: number;
}

export interface UserWithMissionCandidate {
  user: SquadUser;
  bestMatchingMission: ScoredMission;
  allMatchingMissions: ScoredMission[];
  userWorstOverall: ScoredMission;
  totalAvailableCount: number;
}

export interface MissionTypeGroup {
  missionName: string;
  missionScore: number;
  entries: ScoredMission[];
  usersWithMission: UserWithMissionCandidate[];
}

export interface BurnSlot {
  user: SquadUser;
  selectedWorst: ScoredMission | null;
  allUserMissionsSortedWorstFirst: ScoredMission[];
  isManualOverride: boolean;
}

export interface SquadPlan {
  activeSquadUsers: SquadUser[];
  usersWithMissions: SquadUser[];
  usersWithoutMissions: SquadUser[];
  bestSelection: ScoredMission | null;
  isManualBest: boolean;
  /** All active squad users who also hold the selected Best mission type (e.g. everyone with DISRUPTION) */
  usersWithSelectedMissionType: UserWithMissionCandidate[];
  /** All active squad users who hold the #1 highest-ranked mission type overall */
  topMissionTypeName: string | null;
  usersWithTopMissionType: UserWithMissionCandidate[];
  burnSlots: BurnSlot[];
  missionGroups: MissionTypeGroup[];
  allRankedMissions: ScoredMission[];
}

export interface CompletedRunRecord {
  id: string;
  runNumber: number;
  completedAt: number;
  best: {
    userId: string;
    userName: string;
    missionId: string;
    missionName: string;
    setting1?: string;
    setting2?: string;
    scoreDisplay: string;
  };
  burns: {
    userId: string;
    userName: string;
    missionId: string;
    missionName: string;
    setting1?: string;
    setting2?: string;
    scoreDisplay: string;
  }[];
}

export function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function formatScore(n: number): string {
  const r = round3(n);
  return Number.isInteger(r) ? String(r) : r.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
}

function getAverage(items: { score: number }[], fallback: number): number {
  if (!items.length) return fallback;
  const sum = items.reduce((acc, it) => acc + it.score, 0);
  return sum / items.length;
}

export function scoreUserMission(
  mission: UserMission,
  user: SquadUser,
  weights: SheetWeights
): ScoredMission {
  const missionOpt = weights.missions.find(
    (m) => m.name.toLowerCase() === mission.missionName.toLowerCase()
  );
  const baseScore = missionOpt ? missionOpt.score : 0;

  const s1Opt = mission.setting1
    ? weights.setting1.find((s) => s.name.toLowerCase() === mission.setting1!.toLowerCase())
    : undefined;
  const s2Opt = mission.setting2
    ? weights.setting2.find((s) => s.name.toLowerCase() === mission.setting2!.toLowerCase())
    : undefined;

  const setting1Score = s1Opt ? s1Opt.score : null;
  const setting2Score = s2Opt ? s2Opt.score : null;

  const neutral1 = getAverage(weights.setting1, 2.8);
  const neutral2 = getAverage(weights.setting2, 3.166);

  const bindsKnownSum = round3((setting1Score ?? 0) + (setting2Score ?? 0));
  const bindsCount = (setting1Score !== null ? 1 : 0) + (setting2Score !== null ? 1 : 0);
  const knownTotal = round3(baseScore + bindsKnownSum);

  const effectiveBindsTieBreaker = round3(
    (setting1Score ?? neutral1) + (setting2Score ?? neutral2)
  );
  const effectiveCombined = round3(baseScore + effectiveBindsTieBreaker);

  return {
    mission,
    user,
    baseScore,
    setting1Score,
    setting2Score,
    bindsKnownSum,
    bindsCount,
    knownTotal,
    effectiveCombined,
    effectiveBindsTieBreaker,
  };
}

/**
 * Comparator sorting BEST (highest desirability) first
 */
export function compareBestFirst(a: ScoredMission, b: ScoredMission, mode: ScoringMode): number {
  if (mode === 'combined') {
    // If both have identical bindsCount === 2, knownTotal === effectiveCombined
    if (b.effectiveCombined !== a.effectiveCombined) {
      return b.effectiveCombined - a.effectiveCombined;
    }
    if (b.baseScore !== a.baseScore) {
      return b.baseScore - a.baseScore;
    }
    if (b.bindsCount !== a.bindsCount) {
      return b.bindsCount - a.bindsCount;
    }
    return a.mission.createdAt - b.mission.createdAt;
  }

  // Default 'mission-first': sort by Mission Type (D1:E4) first, then break ties using entered settings
  if (b.baseScore !== a.baseScore) {
    return b.baseScore - a.baseScore;
  }
  if (b.effectiveBindsTieBreaker !== a.effectiveBindsTieBreaker) {
    return b.effectiveBindsTieBreaker - a.effectiveBindsTieBreaker;
  }
  if (b.bindsCount !== a.bindsCount) {
    return b.bindsCount - a.bindsCount;
  }
  return a.mission.createdAt - b.mission.createdAt;
}

/**
 * Comparator sorting WORST (lowest desirability — best to burn!) first
 */
export function compareWorstFirst(a: ScoredMission, b: ScoredMission, mode: ScoringMode): number {
  if (mode === 'combined') {
    if (a.effectiveCombined !== b.effectiveCombined) {
      return a.effectiveCombined - b.effectiveCombined;
    }
    if (a.baseScore !== b.baseScore) {
      return a.baseScore - b.baseScore;
    }
    return a.mission.createdAt - b.mission.createdAt;
  }

  if (a.baseScore !== b.baseScore) {
    return a.baseScore - b.baseScore;
  }
  if (a.effectiveBindsTieBreaker !== b.effectiveBindsTieBreaker) {
    return a.effectiveBindsTieBreaker - b.effectiveBindsTieBreaker;
  }
  return a.mission.createdAt - b.mission.createdAt;
}

export function getDisplayScoreText(scored: ScoredMission, mode: ScoringMode): string {
  if (scored.bindsCount === 0) {
    return formatScore(scored.baseScore);
  }
  if (mode === 'combined') {
    return scored.bindsCount === 2
      ? formatScore(scored.knownTotal)
      : `${formatScore(scored.knownTotal)}+`;
  }
  return `${formatScore(scored.baseScore)} (+${formatScore(scored.bindsKnownSum)})`;
}

export function computeSquadPlan(params: {
  users: SquadUser[];
  missions: UserMission[];
  weights: SheetWeights;
  mode: ScoringMode;
  manualBestMissionId?: string | null;
  manualBurnByUser?: Record<string, string>;
}): SquadPlan {
  const {
    users,
    missions,
    weights,
    mode,
    manualBestMissionId = null,
    manualBurnByUser = {},
  } = params;

  // Up to 6 active squad users
  const activeSquadUsers = users.filter((u) => u.inSquad).slice(0, 6);
  const activeUserMap = new Map(activeSquadUsers.map((u) => [u.id, u]));

  // Available (unconsumed) missions belonging to active squad users
  const availableScored: ScoredMission[] = missions
    .filter((m) => m.consumedRunNumber === undefined && activeUserMap.has(m.userId))
    .map((m) => scoreUserMission(m, activeUserMap.get(m.userId)!, weights));

  const missionsByUser = new Map<string, ScoredMission[]>();
  for (const u of activeSquadUsers) {
    missionsByUser.set(u.id, []);
  }
  for (const sm of availableScored) {
    missionsByUser.get(sm.user.id)!.push(sm);
  }

  const usersWithMissions = activeSquadUsers.filter(
    (u) => (missionsByUser.get(u.id)?.length ?? 0) > 0
  );
  const usersWithoutMissions = activeSquadUsers.filter(
    (u) => (missionsByUser.get(u.id)?.length ?? 0) === 0
  );

  // Precompute each user's worst overall mission (for strategic tie-breaking!)
  const worstByUser = new Map<string, ScoredMission>();
  for (const u of usersWithMissions) {
    const list = [...(missionsByUser.get(u.id) || [])].sort((a, b) =>
      compareWorstFirst(a, b, mode)
    );
    if (list.length > 0) {
      worstByUser.set(u.id, list[0]);
    }
  }

  // Build MissionTypeGroups ordered by mission weight high -> low
  const orderedMissionTypes = [...weights.missions].sort((a, b) => b.score - a.score);
  // Include any custom mission names that might exist on missions
  const knownNames = new Set(orderedMissionTypes.map((m) => m.name.toLowerCase()));
  for (const sm of availableScored) {
    if (!knownNames.has(sm.mission.missionName.toLowerCase())) {
      knownNames.add(sm.mission.missionName.toLowerCase());
      orderedMissionTypes.push({ name: sm.mission.missionName, score: sm.baseScore });
    }
  }

  const buildUsersWithMissionList = (entriesForType: ScoredMission[]): UserWithMissionCandidate[] => {
    const byUser = new Map<string, ScoredMission[]>();
    for (const entry of entriesForType) {
      const arr = byUser.get(entry.user.id) || [];
      arr.push(entry);
      byUser.set(entry.user.id, arr);
    }

    const candidates: UserWithMissionCandidate[] = [];
    for (const [uid, list] of byUser.entries()) {
      const sorted = [...list].sort((a, b) => compareBestFirst(a, b, mode));
      const user = activeUserMap.get(uid)!;
      const userAll = missionsByUser.get(uid) || [];
      candidates.push({
        user,
        bestMatchingMission: sorted[0],
        allMatchingMissions: sorted,
        userWorstOverall: worstByUser.get(uid) || sorted[sorted.length - 1],
        totalAvailableCount: userAll.length,
      });
    }

    // Order candidates: best mission score first, then user whose worst mission is HIGHEST
    // (because picking them lets the other tied users burn their LOWER/WORSE trash missions!)
    candidates.sort((a, b) => {
      const cmp = compareBestFirst(a.bestMatchingMission, b.bestMatchingMission, mode);
      if (cmp !== 0) return cmp;
      // Strategic tie-breaker: higher worst mission score runs Best, so others burn worse missions
      const worstCmp = compareBestFirst(a.userWorstOverall, b.userWorstOverall, mode);
      if (worstCmp !== 0) return worstCmp;
      return 0;
    });

    return candidates;
  };

  const missionGroups: MissionTypeGroup[] = orderedMissionTypes.map((mt) => {
    const entries = availableScored
      .filter((sm) => sm.mission.missionName.toLowerCase() === mt.name.toLowerCase())
      .sort((a, b) => compareBestFirst(a, b, mode));

    return {
      missionName: mt.name,
      missionScore: mt.score,
      entries,
      usersWithMission: buildUsersWithMissionList(entries),
    };
  });

  const allRankedMissions = [...availableScored].sort((a, b) => {
    const cmp = compareBestFirst(a, b, mode);
    if (cmp !== 0) return cmp;
    const worstA = worstByUser.get(a.user.id)!;
    const worstB = worstByUser.get(b.user.id)!;
    return compareBestFirst(worstA, worstB, mode);
  });

  // Determine Best Selection (1 user)
  let bestSelection: ScoredMission | null = null;
  let isManualBest = false;

  if (manualBestMissionId) {
    const found = availableScored.find((sm) => sm.mission.id === manualBestMissionId);
    if (found) {
      bestSelection = found;
      isManualBest = true;
    }
  }

  if (!bestSelection && allRankedMissions.length > 0) {
    bestSelection = allRankedMissions[0];
  }

  // Top mission type overall (e.g. Disruption if anyone has Disruption)
  const firstNonEmptyGroup = missionGroups.find((g) => g.entries.length > 0) || null;
  const topMissionTypeName = firstNonEmptyGroup ? firstNonEmptyGroup.missionName : null;
  const usersWithTopMissionType = firstNonEmptyGroup ? firstNonEmptyGroup.usersWithMission : [];

  // Users who share the currently selected Best mission's type
  const selectedGroup = bestSelection
    ? missionGroups.find(
        (g) => g.missionName.toLowerCase() === bestSelection!.mission.missionName.toLowerCase()
      )
    : null;
  const usersWithSelectedMissionType = selectedGroup ? selectedGroup.usersWithMission : [];

  // Determine Worst Mission for each of the OTHER (up to 5) active squad users
  const burnSlots: BurnSlot[] = [];
  for (const u of activeSquadUsers) {
    if (bestSelection && u.id === bestSelection.user.id) {
      continue;
    }
    const userMissionsWorstFirst = [...(missionsByUser.get(u.id) || [])].sort((a, b) =>
      compareWorstFirst(a, b, mode)
    );
    const manualId = manualBurnByUser[u.id];
    const manualFound = manualId
      ? userMissionsWorstFirst.find((sm) => sm.mission.id === manualId)
      : undefined;

    burnSlots.push({
      user: u,
      selectedWorst: manualFound || userMissionsWorstFirst[0] || null,
      allUserMissionsSortedWorstFirst: userMissionsWorstFirst,
      isManualOverride: Boolean(manualFound),
    });
  }

  return {
    activeSquadUsers,
    usersWithMissions,
    usersWithoutMissions,
    bestSelection,
    isManualBest,
    usersWithSelectedMissionType,
    topMissionTypeName,
    usersWithTopMissionType,
    burnSlots: burnSlots.slice(0, 5),
    missionGroups,
    allRankedMissions,
  };
}

/**
 * Sample 6-player squad demonstrating:
 * - Multiple users holding DISRUPTION (so tie-display & selection is immediately clear)
 * - 3 Cryobells per user (18 missions total, ready for 3 back-to-back runs!)
 * - Entered initially without the 2 additional settings (matching the prompt's workflow!)
 */
export function createSampleSquadData(): { users: SquadUser[]; missions: UserMission[] } {
  const names = ['Tenno_Alpha', 'KhoraPrime', 'FrostByte', 'Valkyrion', 'NovaStar', 'ZephyrSix'];
  const now = Date.now();
  const users: SquadUser[] = names.map((name, idx) => ({
    id: `sample-u-${idx + 1}`,
    name,
    inSquad: true,
  }));

  const sampleBellsPerUser: string[][] = [
    ['Disruption', 'Excavation', 'Mobile Defence'], // Tenno_Alpha (has Disruption + Mobile Defence)
    ['Disruption', 'Survival', 'Excavation'], // KhoraPrime (has Disruption, worst is Excavation!)
    ['Survival', 'Mobile Defence', 'Mobile Defence'], // FrostByte
    ['Disruption', 'Mobile Defence', 'Mobile Defence'], // Valkyrion (3rd user with Disruption!)
    ['Excavation', 'Excavation', 'Mobile Defence'], // NovaStar
    ['Survival', 'Excavation', 'Mobile Defence'], // ZephyrSix
  ];

  const missions: UserMission[] = [];
  let counter = 1;
  users.forEach((u, uIdx) => {
    sampleBellsPerUser[uIdx].forEach((missionName) => {
      missions.push({
        id: `sample-m-${counter}`,
        userId: u.id,
        missionName,
        createdAt: now + counter,
      });
      counter++;
    });
  });

  return { users, missions };
}
