import assert from "node:assert/strict";
import test from "node:test";
import {
  createDemoState,
  DEFAULT_SCORES,
  missionScore,
  parseCsv,
  rankRuns,
  scoresFromCsv,
  validateState,
} from "../src/lib/planner";

test("all 23 supplied scores are present and exact", () => {
  assert.equal(DEFAULT_SCORES.missions.length, 4);
  assert.equal(DEFAULT_SCORES.setting1.length, 5);
  assert.equal(DEFAULT_SCORES.setting2.length, 14);
  assert.deepEqual(
    DEFAULT_SCORES.missions.map((entry) => entry.score),
    [5, 3.666, 3, 1.333],
  );
  assert.deepEqual(
    DEFAULT_SCORES.setting1.map((entry) => entry.score),
    [4.333, 3, 2.666, 2.333, 1.666],
  );
  assert.deepEqual(
    DEFAULT_SCORES.setting2.map((entry) => entry.score),
    [
      4.333, 4, 3.666, 3.666, 3.666, 3.333, 3.333, 3.333, 3, 2.666, 2.666,
      2.333, 2.333, 1.666,
    ],
  );
});

test("every plan gives exactly one player their maximum and five their minimum", () => {
  const state = createDemoState();
  const runs = rankRuns(state.players, state.missions, state.scores, false);
  assert.equal(runs.length, 6);
  for (const run of runs) {
    assert.equal(run.picks.length, 6);
    assert.equal(run.picks.filter((pick) => pick.isPriority).length, 1);
    for (const pick of run.picks) {
      const scores = state.missions
        .filter((mission) => mission.playerId === pick.player.id)
        .map((mission) => missionScore(mission, state.scores, false));
      assert.equal(
        pick.score,
        pick.isPriority ? Math.max(...scores) : Math.min(...scores),
      );
    }
  }
  assert.equal(runs[0].priority.name, "Nova");
  assert.ok(
    runs.every(
      (run, index) => index === 0 || runs[index - 1].advantage >= run.advantage,
    ),
  );
});

test("incomplete squads and players without missions cannot produce a run", () => {
  const state = createDemoState();
  assert.equal(
    rankRuns(state.players.slice(0, 5), state.missions, state.scores, false)
      .length,
    0,
  );
  assert.equal(
    rankRuns(
      state.players,
      state.missions.filter(
        (mission) => mission.playerId !== state.players[0].id,
      ),
      state.scores,
      false,
    ).length,
    0,
  );
  assert.equal(rankRuns([], [], state.scores, false).length, 0);
});

test("additional settings do not affect base mode and sum exactly when enabled", () => {
  const state = createDemoState();
  const mission = {
    ...state.missions[0],
    setting1: "Stone Soldiers",
    setting2: "Archaic Armor",
  };
  assert.equal(missionScore(mission, state.scores, false), 5);
  assert.equal(missionScore(mission, state.scores, true), 13.666);
  assert.equal(
    missionScore(
      { ...mission, setting1: "", setting2: "" },
      state.scores,
      true,
    ),
    5,
  );
});

test("all equal-scoring alternatives are preserved", () => {
  const state = createDemoState();
  state.scores.missions = state.scores.missions.map((entry) => ({
    ...entry,
    score: 3,
  }));
  const runs = rankRuns(state.players, state.missions, state.scores, false);
  for (const run of runs)
    for (const pick of run.picks) assert.equal(pick.alternatives.length, 2);
});

test("CSV parser handles quoted commas, escaped quotes, and newlines", () => {
  assert.deepEqual(parseCsv('"Stone, Soldiers","4.333"\r\n"Say ""hi""",3'), [
    ["Stone, Soldiers", "4.333"],
    ['Say "hi"', "3"],
  ]);
  assert.deepEqual(parseCsv('"line\nbreak",4'), [["line\nbreak", "4"]]);
});

test("sheet CSV maps D/E, G/H, and J/K columns without losing the first row", () => {
  const csv = Array.from({ length: 14 }, (_, index) => {
    const mission = DEFAULT_SCORES.missions[index];
    const first = DEFAULT_SCORES.setting1[index];
    const second = DEFAULT_SCORES.setting2[index];
    return [
      mission?.name ?? "",
      mission?.score ?? "",
      "",
      first?.name ?? "",
      first?.score ?? "",
      "",
      second.name,
      second.score,
    ]
      .map((value) => JSON.stringify(String(value)))
      .join(",");
  }).join("\n");
  assert.deepEqual(scoresFromCsv(csv), DEFAULT_SCORES);
  assert.deepEqual(
    scoresFromCsv('"","","","","","","",""\n' + csv),
    DEFAULT_SCORES,
  );
  assert.deepEqual(
    scoresFromCsv('"D","E","F","G","H","I","J","K"\n' + csv),
    DEFAULT_SCORES,
  );
  assert.throws(() => scoresFromCsv("<!doctype html><html>Login</html>"));
  assert.throws(() => scoresFromCsv("Disruption,5"));
  assert.throws(() => scoresFromCsv(csv.replace('"5"', '"NaN"')));
});

test("squad imports reject malformed or orphaned data and normalize selection", () => {
  const state = createDemoState();
  assert.equal(validateState(state).players.length, 6);
  assert.throws(() => validateState({}));
  assert.throws(() =>
    validateState({ ...state, players: [...state.players, state.players[0]] }),
  );
  assert.throws(() =>
    validateState({
      ...state,
      missions: [{ ...state.missions[0], playerId: "missing" }],
    }),
  );
  assert.throws(() =>
    validateState({
      ...state,
      missions: [{ ...state.missions[0], type: "fake" }],
    }),
  );
  assert.throws(() =>
    validateState({
      ...state,
      missions: [{ ...state.missions[0], setting1: "fake" }],
    }),
  );
  assert.deepEqual(
    validateState({
      ...state,
      selectedIds: ["missing", state.players[0].id, state.players[0].id],
    }).selectedIds,
    [state.players[0].id],
  );
});

test("valid confirmed runs survive a reload, but stale plans are discarded", () => {
  const state = createDemoState();
  const run = rankRuns(state.players, state.missions, state.scores, false).find(
    (item) => item.priority.id === state.priorityId,
  )!;
  state.savedRun = {
    priorityId: run.priority.id,
    missionIds: run.picks.map((pick) => pick.mission.id),
    createdAt: new Date().toISOString(),
  };
  assert.deepEqual(validateState(state).savedRun, state.savedRun);
  const invalid = structuredClone(state);
  invalid.savedRun!.missionIds[0] = "missing";
  assert.equal(validateState(invalid).savedRun, null);
});
