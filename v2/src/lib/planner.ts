export type ScoreEntry = { name: string; score: number };
export type Scores = {
  missions: ScoreEntry[];
  setting1: ScoreEntry[];
  setting2: ScoreEntry[];
};
export type Player = { id: string; name: string; color: number };
export type Mission = {
  id: string;
  playerId: string;
  type: string;
  setting1: string;
  setting2: string;
};
export type SavedRun = {
  priorityId: string;
  missionIds: string[];
  createdAt: string;
};
export type PlannerState = {
  players: Player[];
  missions: Mission[];
  selectedIds: string[];
  priorityId: string;
  includeSettings: boolean;
  scores: Scores;
  lastSynced: string | null;
  isDemo: boolean;
  savedRun: SavedRun | null;
};
export type RunPick = {
  player: Player;
  mission: Mission;
  alternatives: Mission[];
  score: number;
  isPriority: boolean;
};
export type RankedRun = {
  priority: Player;
  picks: RunPick[];
  priorityScore: number;
  otherAverage: number;
  advantage: number;
};

export const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1rrzniKaPt38JsWPeIIGPZ0avNQdol_1_v86V82t03cc/edit?gid=730193451#gid=730193451";
export const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1rrzniKaPt38JsWPeIIGPZ0avNQdol_1_v86V82t03cc/gviz/tq?tqx=out:csv&gid=730193451&range=D1:K14&headers=0";
export const STORAGE_KEY = "voidline-planner-v1";

export const DEFAULT_SCORES: Scores = {
  missions: [
    { name: "Disruption", score: 5 },
    { name: "Survival", score: 3.666 },
    { name: "Excavation", score: 3 },
    { name: "Mobile Defence", score: 1.333 },
  ],
  setting1: [
    { name: "Stone Soldiers", score: 4.333 },
    { name: "Inferno", score: 3 },
    { name: "Entropic Overload", score: 2.666 },
    { name: "Thin Boundary", score: 2.333 },
    { name: "Miasmic Militia", score: 1.666 },
  ],
  setting2: [
    { name: "Archaic Armor", score: 4.333 },
    { name: "Clumsy Munitions", score: 4 },
    { name: "Antimatter Foes", score: 3.666 },
    { name: "Entanglement", score: 3.666 },
    { name: "Kela's Revenge", score: 3.666 },
    { name: "Jade Spirits", score: 3.333 },
    { name: "Postmortal Surges", score: 3.333 },
    { name: "Toasty Toes", score: 3.333 },
    { name: "Bolstered Belligerents", score: 3 },
    { name: "Cumulonimbus", score: 2.666 },
    { name: "Heavy Warfare", score: 2.666 },
    { name: "Bruised Shields", score: 2.333 },
    { name: "Myopic Munitions", score: 2.333 },
    { name: "Parasitic Light", score: 1.666 },
  ],
};

export const uid = () =>
  globalThis.crypto?.randomUUID?.() ??
  `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const formatScore = (score: number) => score.toFixed(3);
export const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export function createDemoState(): PlannerState {
  const names = ["Voidwalker", "Nova", "Ash", "Wisp", "Volt", "Trinity"];
  const types = [
    ["Disruption", "Excavation"],
    ["Disruption", "Survival"],
    ["Disruption", "Mobile Defence"],
    ["Survival", "Excavation"],
    ["Survival", "Mobile Defence"],
    ["Excavation", "Mobile Defence"],
  ];
  const players = names.map((name, index) => ({
    id: `player-${index + 1}`,
    name,
    color: index,
  }));
  return {
    players,
    missions: players.flatMap((player, index) =>
      types[index].map((type, j) => ({
        id: `mission-${index}-${j}`,
        playerId: player.id,
        type,
        setting1: "",
        setting2: "",
      })),
    ),
    selectedIds: players.map((player) => player.id),
    priorityId: players[0].id,
    includeSettings: false,
    scores: structuredClone(DEFAULT_SCORES),
    lastSynced: null,
    isDemo: true,
    savedRun: null,
  };
}

export function missionScore(
  mission: Mission,
  scores: Scores,
  includeSettings: boolean,
): number {
  const base =
    scores.missions.find((item) => item.name === mission.type)?.score ?? 0;
  if (!includeSettings) return base;
  const first =
    scores.setting1.find((item) => item.name === mission.setting1)?.score ?? 0;
  const second =
    scores.setting2.find((item) => item.name === mission.setting2)?.score ?? 0;
  return Math.round((base + first + second) * 1000) / 1000;
}

export function rankRuns(
  players: Player[],
  missions: Mission[],
  scores: Scores,
  includeSettings: boolean,
): RankedRun[] {
  if (
    players.length !== 6 ||
    players.some(
      (player) => !missions.some((mission) => mission.playerId === player.id),
    )
  )
    return [];
  return players
    .map((priority) => {
      const picks = players
        .map((player) => {
          const isPriority = player.id === priority.id;
          const options = missions
            .filter((mission) => mission.playerId === player.id)
            .map((mission) => ({
              mission,
              score: missionScore(mission, scores, includeSettings),
            }))
            .sort(
              (a, b) =>
                (isPriority ? b.score - a.score : a.score - b.score) ||
                a.mission.type.localeCompare(b.mission.type) ||
                a.mission.id.localeCompare(b.mission.id),
            );
          const best = options[0];
          return {
            player,
            mission: best.mission,
            score: best.score,
            isPriority,
            alternatives: options
              .filter((option) => option.score === best.score)
              .map((option) => option.mission),
          };
        })
        .sort(
          (a, b) =>
            Number(b.isPriority) - Number(a.isPriority) ||
            a.score - b.score ||
            a.player.name.localeCompare(b.player.name),
        );
      const priorityScore = picks.find((pick) => pick.isPriority)!.score;
      const otherAverage =
        picks
          .filter((pick) => !pick.isPriority)
          .reduce((sum, pick) => sum + pick.score, 0) / 5;
      return {
        priority,
        picks,
        priorityScore,
        otherAverage,
        advantage: priorityScore - otherAverage,
      };
    })
    .sort(
      (a, b) =>
        b.advantage - a.advantage ||
        b.priorityScore - a.priorityScore ||
        a.priority.name.localeCompare(b.priority.name),
    );
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const character = text[i];
    if (character === '"') {
      if (quoted && text[i + 1] === '"') {
        value += '"';
        i++;
      } else quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[i + 1] === "\n") i++;
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else value += character;
  }
  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }
  return rows;
}

export function scoresFromCsv(text: string): Scores {
  if (/<!doctype|<html|accounts\.google/i.test(text))
    throw new Error("The spreadsheet is not publicly readable.");
  const parsed = parseCsv(text);
  // Google's CSV transport can emit a column-label row even with headers=0.
  const firstDataRow = parsed.findIndex((row) =>
    [0, 3, 6].every(
      (column) =>
        row[column]?.trim() &&
        row[column + 1]?.trim() &&
        Number.isFinite(Number(row[column + 1])),
    ),
  );
  if (firstDataRow < 0 || firstDataRow > 1)
    throw new Error(
      "The spreadsheet ranges do not contain the expected names and scores.",
    );
  const rows = parsed.slice(firstDataRow);
  const readRange = (column: number, count: number): ScoreEntry[] => {
    const result = rows
      .slice(0, count)
      .map((row) => ({
        name: row[column]?.trim(),
        score: Number(row[column + 1]?.trim()),
      }));
    if (
      result.length !== count ||
      result.some(
        (entry, index) =>
          !entry.name ||
          !rows[index][column + 1]?.trim() ||
          !Number.isFinite(entry.score) ||
          entry.score < 0,
      )
    ) {
      throw new Error(
        "The spreadsheet ranges do not contain the expected names and scores.",
      );
    }
    if (new Set(result.map((entry) => entry.name.toLowerCase())).size !== count)
      throw new Error("The spreadsheet contains duplicate score names.");
    return result;
  };
  // The response starts at column D, so G and J are offsets 3 and 6.
  return {
    missions: readRange(0, 4),
    setting1: readRange(3, 5),
    setting2: readRange(6, 14),
  };
}

export function validateState(input: unknown): PlannerState {
  if (!input || typeof input !== "object")
    throw new Error("Invalid squad file.");
  const data = input as PlannerState;
  if (
    !Array.isArray(data.players) ||
    !Array.isArray(data.missions) ||
    !Array.isArray(data.selectedIds)
  )
    throw new Error("Invalid squad file.");
  if (data.players.length > 100 || data.missions.length > 2000)
    throw new Error("This squad file is too large.");
  if (
    data.players.some(
      (player) =>
        typeof player.id !== "string" ||
        typeof player.name !== "string" ||
        !player.name.trim() ||
        player.name.length > 32 ||
        !Number.isInteger(player.color),
    )
  )
    throw new Error("Invalid player data.");
  if (
    new Set(data.players.map((player) => player.id)).size !==
      data.players.length ||
    new Set(data.players.map((player) => player.name.trim().toLowerCase()))
      .size !== data.players.length
  )
    throw new Error("Player names and IDs must be unique.");
  for (const key of ["missions", "setting1", "setting2"] as const) {
    if (
      !Array.isArray(data.scores?.[key]) ||
      !data.scores[key].length ||
      data.scores[key].length > 100 ||
      data.scores[key].some(
        (entry) =>
          typeof entry.name !== "string" ||
          !entry.name.trim() ||
          typeof entry.score !== "number" ||
          !Number.isFinite(entry.score) ||
          entry.score < 0,
      )
    )
      throw new Error("Invalid score reference.");
  }
  if (
    data.missions.some(
      (mission) =>
        typeof mission.id !== "string" ||
        !data.players.some((player) => player.id === mission.playerId) ||
        !data.scores.missions.some((entry) => entry.name === mission.type) ||
        typeof mission.setting1 !== "string" ||
        typeof mission.setting2 !== "string" ||
        (mission.setting1 &&
          !data.scores.setting1.some(
            (entry) => entry.name === mission.setting1,
          )) ||
        (mission.setting2 &&
          !data.scores.setting2.some(
            (entry) => entry.name === mission.setting2,
          )),
    )
  )
    throw new Error("Invalid mission data.");
  if (
    new Set(data.missions.map((mission) => mission.id)).size !==
    data.missions.length
  )
    throw new Error("Mission IDs must be unique.");
  const selectedIds = [...new Set(data.selectedIds)]
    .filter((id) => data.players.some((player) => player.id === id))
    .slice(0, 6);
  const priorityId = selectedIds.includes(data.priorityId)
    ? data.priorityId
    : (selectedIds[0] ?? "");
  let savedRun: SavedRun | null = null;
  if (
    data.savedRun &&
    data.savedRun.priorityId === priorityId &&
    Array.isArray(data.savedRun.missionIds) &&
    data.savedRun.missionIds.length === 6 &&
    typeof data.savedRun.createdAt === "string" &&
    Number.isFinite(Date.parse(data.savedRun.createdAt))
  ) {
    const candidate = rankRuns(
      data.players.filter((player) => selectedIds.includes(player.id)),
      data.missions,
      data.scores,
      Boolean(data.includeSettings),
    ).find((run) => run.priority.id === priorityId);
    if (
      candidate?.picks.every((pick) =>
        pick.alternatives.some((mission) =>
          data.savedRun!.missionIds.includes(mission.id),
        ),
      )
    )
      savedRun = data.savedRun;
  }
  return {
    ...data,
    selectedIds,
    priorityId,
    includeSettings: Boolean(data.includeSettings),
    isDemo: Boolean(data.isDemo),
    lastSynced:
      typeof data.lastSynced === "string" &&
      Number.isFinite(Date.parse(data.lastSynced))
        ? data.lastSynced
        : null,
    savedRun,
  };
}

export function savedTieChoices(state: PlannerState): Record<string, string> {
  if (!state.savedRun) return {};
  return Object.fromEntries(
    state.missions
      .filter((mission) => state.savedRun!.missionIds.includes(mission.id))
      .map((mission) => [
        `${state.savedRun!.priorityId}:${mission.playerId}`,
        mission.id,
      ]),
  );
}

export function loadState(): PlannerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return validateState(JSON.parse(raw));
  } catch {
    /* A blocked or outdated local store should not prevent use. */
  }
  return createDemoState();
}

export function runText(run: RankedRun, includeSettings: boolean): string {
  return [
    "VOIDLINE / SQUAD RUN",
    `Priority player: ${run.priority.name}`,
    `Scoring: ${includeSettings ? "Base + additional settings" : "Base mission scores only"}`,
    "",
    ...run.picks.map(
      (pick, index) =>
        `${index + 1}. ${pick.player.name} - ${pick.mission.type} (${formatScore(pick.score)})${pick.isPriority ? " [BEST]" : " [LOWEST]"}${
          includeSettings
            ? [pick.mission.setting1, pick.mission.setting2]
                .filter(Boolean)
                .map((setting) => ` / ${setting}`)
                .join("")
            : ""
        }${pick.alternatives.length > 1 ? ` | Tied options: ${pick.alternatives.map((mission) => mission.type).join(", ")}` : ""}`,
    ),
    "",
    `Priority score: ${formatScore(run.priorityScore)}`,
    `Other five average: ${formatScore(run.otherAverage)}`,
    `Score advantage: ${formatScore(run.advantage)}`,
  ].join("\n");
}
