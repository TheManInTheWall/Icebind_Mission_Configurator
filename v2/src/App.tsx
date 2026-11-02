import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { motion, MotionConfig } from "motion/react";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCheck,
  CircleHelp,
  Copy,
  Download,
  FileSpreadsheet,
  Info,
  Plus,
  Star,
  Trash2,
  Users,
} from "lucide-react";
const orbitalScene = `${import.meta.env.BASE_URL}images/orbital-scene.jpg`;
import {
  DEFAULT_SCORES,
  SHEET_CSV_URL,
  STORAGE_KEY,
  formatScore,
  loadState,
  rankRuns,
  runText,
  savedTieChoices,
  scoresFromCsv,
  uid,
  validateState,
} from "./lib/planner";
import type { Mission, PlannerState, RankedRun } from "./lib/planner";
import { Avatar, Brand, downloadFile, Modal } from "./components/ui";
import { Help, MissionForm, SquadManager } from "./components/Dialogs";
import { ScoreReference } from "./components/ScoreReference";
import { MissionBoard } from "./components/MissionBoard";
import type { BoardTab } from "./components/MissionBoard";
import { SquadPanel } from "./components/SquadPanel";
import { Notification } from "./components/Notification";

type ModalState =
  | { type: "mission"; mission?: Mission; defaultType?: string }
  | { type: "squad" | "help" | "reset" }
  | { type: "delete"; mission: Mission }
  | { type: "run"; run: RankedRun }
  | null;
type Toast = { message: string; kind: "success" | "error" };

export default function App() {
  const [state, setState] = useState<PlannerState>(loadState);
  const [page, setPage] = useState<"planner" | "scores">("planner");
  const [tab, setTab] = useState<BoardTab>("missions");
  const [modal, setModal] = useState<ModalState>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [savingWorks, setSavingWorks] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [boardKey, setBoardKey] = useState(0);
  const [tieChoices, setTieChoices] = useState<Record<string, string>>(() =>
    savedTieChoices(state),
  );
  const generationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncController = useRef<AbortController | null>(null);
  const selectedPlayers = useMemo(
    () =>
      state.players.filter((player) => state.selectedIds.includes(player.id)),
    [state.players, state.selectedIds],
  );
  const rankedRuns = useMemo(
    () =>
      rankRuns(
        selectedPlayers,
        state.missions,
        state.scores,
        state.includeSettings,
      ),
    [selectedPlayers, state.missions, state.scores, state.includeSettings],
  );
  const baseRun =
    rankedRuns.find((run) => run.priority.id === state.priorityId) ??
    rankedRuns[0];
  const currentRun = useMemo(
    () =>
      baseRun
        ? {
            ...baseRun,
            picks: baseRun.picks.map((pick) => ({
              ...pick,
              mission:
                pick.alternatives.find(
                  (mission) =>
                    mission.id ===
                    tieChoices[`${baseRun.priority.id}:${pick.player.id}`],
                ) ?? pick.mission,
            })),
          }
        : undefined,
    [baseRun, tieChoices],
  );
  const missingPlayers = selectedPlayers.filter(
    (player) =>
      !state.missions.some((mission) => mission.playerId === player.id),
  );
  const canRank = selectedPlayers.length === 6 && missingPlayers.length === 0;
  const selectionMessage =
    selectedPlayers.length !== 6
      ? `Select ${6 - selectedPlayers.length} more ${selectedPlayers.length === 5 ? "player" : "players"} to build a run.`
      : missingPlayers.length
        ? `Add a mission for ${missingPlayers.map((player) => player.name).join(", ")}.`
        : "One best. Five lowest. Ready when you are.";
  const notify = (message: string, kind: Toast["kind"] = "success") =>
    setToast({ message, kind });
  const runSelected = Boolean(
    currentRun &&
    state.savedRun?.priorityId === currentRun.priority.id &&
    currentRun.picks.every((pick) =>
      state.savedRun!.missionIds.includes(pick.mission.id),
    ),
  );

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      setSavingWorks(true);
    } catch {
      setSavingWorks(false);
    }
  }, [state]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(
    () => () => {
      if (generationTimer.current) clearTimeout(generationTimer.current);
      syncController.current?.abort();
    },
    [],
  );

  function openMission(defaultType?: string) {
    setModal(
      state.players.length
        ? { type: "mission", defaultType }
        : { type: "squad" },
    );
  }
  function saveMission(mission: Mission): string | null {
    if (
      state.missions.some(
        (item) =>
          item.id !== mission.id &&
          item.playerId === mission.playerId &&
          item.type === mission.type &&
          item.setting1 === mission.setting1 &&
          item.setting2 === mission.setting2,
      )
    )
      return "This player already has that mission and settings combination.";
    const exists = state.missions.some((item) => item.id === mission.id);
    setState((current) => ({
      ...current,
      missions: exists
        ? current.missions.map((item) =>
            item.id === mission.id ? mission : item,
          )
        : [...current.missions, mission],
      savedRun: null,
    }));
    setModal(null);
    notify(
      exists
        ? "Mission updated. Your rankings are up to date."
        : "Mission added to your squad.",
    );
    return null;
  }
  function addPlayer(name: string): string | null {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 32)
      return "Enter a player name between 1 and 32 characters.";
    if (state.players.length >= 100)
      return "A maximum of 100 players can be saved.";
    if (
      state.players.some(
        (player) => player.name.toLowerCase() === trimmed.toLowerCase(),
      )
    )
      return "There is already a player with that name.";
    const player = {
      id: uid(),
      name: trimmed,
      color: state.players.length % 6,
    };
    setState((current) => ({
      ...current,
      players: [...current.players, player],
      selectedIds:
        current.selectedIds.length < 6
          ? [...current.selectedIds, player.id]
          : current.selectedIds,
      priorityId: current.priorityId || player.id,
      savedRun: null,
    }));
    return null;
  }
  function renamePlayer(id: string, name: string): string | null {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 32)
      return "Player names must be between 1 and 32 characters.";
    if (
      state.players.some(
        (player) =>
          player.id !== id &&
          player.name.toLowerCase() === trimmed.toLowerCase(),
      )
    )
      return "There is already a player with that name.";
    setState((current) => ({
      ...current,
      players: current.players.map((player) =>
        player.id === id ? { ...player, name: trimmed } : player,
      ),
    }));
    return null;
  }
  function removePlayer(id: string) {
    setState((current) => {
      const selectedIds = current.selectedIds.filter((value) => value !== id);
      return {
        ...current,
        players: current.players.filter((player) => player.id !== id),
        missions: current.missions.filter((mission) => mission.playerId !== id),
        selectedIds,
        priorityId:
          current.priorityId === id
            ? (selectedIds[0] ?? "")
            : current.priorityId,
        savedRun: null,
      };
    });
    notify("Player and their missions removed.");
  }
  function togglePlayer(id: string) {
    if (!state.selectedIds.includes(id) && state.selectedIds.length === 6) {
      notify("Your squad is full. Deselect a player first.", "error");
      return;
    }
    setState((current) => {
      const selectedIds = current.selectedIds.includes(id)
        ? current.selectedIds.filter((value) => value !== id)
        : [...current.selectedIds, id];
      return {
        ...current,
        selectedIds,
        priorityId: selectedIds.includes(current.priorityId)
          ? current.priorityId
          : (selectedIds[0] ?? ""),
        savedRun: null,
      };
    });
  }
  function setPriority(id: string) {
    if (!state.selectedIds.includes(id)) {
      notify(
        "Select this player for your squad before making them the priority.",
        "error",
      );
      return;
    }
    setState((current) => ({ ...current, priorityId: id, savedRun: null }));
  }
  function generateRun() {
    if (!canRank || generating) return;
    setGenerating(true);
    generationTimer.current = setTimeout(() => {
      setGenerating(false);
      setTab("ranked");
      setPage("planner");
      setBoardKey((key) => key + 1);
      if (window.innerWidth < 900)
        document
          .getElementById("mission-board")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 500);
  }
  async function syncScores() {
    if (syncing) return;
    setSyncing(true);
    setSyncError("");
    const controller = new AbortController();
    syncController.current = controller;
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(SHEET_CSV_URL, {
        signal: controller.signal,
        credentials: "omit",
        cache: "no-store",
      });
      if (!response.ok)
        throw new Error("Google Sheets did not allow public access.");
      const scores = scoresFromCsv(await response.text());
      const incompatible = state.missions.some(
        (mission) =>
          !scores.missions.some((entry) => entry.name === mission.type) ||
          (mission.setting1 &&
            !scores.setting1.some(
              (entry) => entry.name === mission.setting1,
            )) ||
          (mission.setting2 &&
            !scores.setting2.some((entry) => entry.name === mission.setting2)),
      );
      if (incompatible)
        throw new Error(
          "The sheet renamed a mission or setting used by your squad. Update those missions before refreshing.",
        );
      setState((current) => ({
        ...current,
        scores,
        lastSynced: new Date().toISOString(),
        savedRun: null,
      }));
      notify("All 23 scores refreshed from Google Sheets.");
    } catch (error) {
      setSyncError(
        error instanceof Error &&
          error.name !== "TypeError" &&
          error.name !== "AbortError"
          ? error.message
          : "The sheet could not be reached or is not publicly readable.",
      );
    } finally {
      clearTimeout(timeout);
      setSyncing(false);
    }
  }
  function restoreScores() {
    if (
      state.missions.some(
        (mission) =>
          !DEFAULT_SCORES.missions.some(
            (entry) => entry.name === mission.type,
          ) ||
          (mission.setting1 &&
            !DEFAULT_SCORES.setting1.some(
              (entry) => entry.name === mission.setting1,
            )) ||
          (mission.setting2 &&
            !DEFAULT_SCORES.setting2.some(
              (entry) => entry.name === mission.setting2,
            )),
      )
    ) {
      notify(
        "Update missions with custom names before restoring the original scores.",
        "error",
      );
      return;
    }
    setState((current) => ({
      ...current,
      scores: structuredClone(DEFAULT_SCORES),
      lastSynced: null,
      savedRun: null,
    }));
    setSyncError("");
    notify("The original provided scores are restored.");
  }
  function exportSquad() {
    downloadFile(
      "voidline-squad.json",
      JSON.stringify(state, null, 2),
      "application/json",
    );
    notify("Squad exported. Import it on any device.");
  }
  async function importSquad(file: File) {
    try {
      if (file.size > 1_000_000)
        throw new Error("Choose a squad file smaller than 1 MB.");
      const next = validateState(JSON.parse(await file.text()));
      setState({ ...next, isDemo: false });
      setBoardKey((key) => key + 1);
      setTieChoices(savedTieChoices(next));
      setModal(null);
      notify("Squad imported and saved to this device.");
    } catch (error) {
      notify(
        error instanceof Error && !(error instanceof SyntaxError)
          ? error.message
          : "Choose a valid Voidline squad JSON file.",
        "error",
      );
    }
  }
  async function copyRun(run: RankedRun) {
    try {
      await navigator.clipboard.writeText(runText(run, state.includeSettings));
      notify("Run copied. Send it to your squad.");
    } catch {
      downloadFile(
        "voidline-run.txt",
        runText(run, state.includeSettings),
        "text/plain",
      );
      notify("Clipboard unavailable. Your run was downloaded instead.");
    }
  }
  function resetSquad() {
    setState((current) => ({
      ...current,
      players: [],
      missions: [],
      selectedIds: [],
      priorityId: "",
      isDemo: false,
      savedRun: null,
    }));
    setTab("missions");
    setBoardKey((key) => key + 1);
    setTieChoices({});
    setModal({ type: "squad" });
    notify("A fresh start. Add your first player.");
  }

  async function exportHtml() {
    try {
      let html: string;
      if (document.querySelector("script[src]")) {
        const response = await fetch("./mission-planner.html");
        html = await response.text();
        const parsed = new DOMParser().parseFromString(html, "text/html");
        if (
          !response.ok ||
          parsed.querySelector("script[src]") ||
          !parsed.querySelector("#root") ||
          !parsed.querySelector('script[type="module"]')
        )
          throw new Error("The standalone build is unavailable.");
      } else {
        // A production page contains its own fonts, artwork, styles, and code.
        const clone = document.documentElement.cloneNode(true) as HTMLElement;
        clone.querySelector("#root")!.innerHTML = "";
        clone.querySelector("body")!.style.overflow = "";
        html = "<!doctype html>\n" + clone.outerHTML;
      }
      downloadFile("index.html", html, "text/html");
      notify("HTML downloaded. Upload it as index.html to GitHub Pages.");
    } catch {
      notify(
        "Unable to download. Use the index.html file in the built dist folder.",
        "error",
      );
    }
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="app-shell">
        <a className="skip-link" href="#main-content">
          Skip to mission planner
        </a>
        <header className="site-header">
          <div className="header-inner">
            <button
              className="brand-button"
              aria-label="Voidline home"
              onClick={() => {
                setPage("planner");
                setTab("missions");
              }}
            >
              <Brand />
            </button>
            <span className="header-divider" />
            <span className="product-label">MISSION PLANNER</span>
            <nav className="main-nav" aria-label="Main navigation">
              <button
                className={page === "planner" ? "nav-item active" : "nav-item"}
                onClick={() => setPage("planner")}
              >
                Planner
              </button>
              <button
                className={page === "scores" ? "nav-item active" : "nav-item"}
                onClick={() => setPage("scores")}
              >
                Score reference
              </button>
              <button
                className="nav-item"
                onClick={() => setModal({ type: "squad" })}
              >
                My squad
              </button>
            </nav>
            <div className="header-actions">
              <span className="session-status">
                <span className="status-dot" />
                Local session
              </span>
              <button
                className="icon-button help-button"
                aria-label="How Voidline works"
                onClick={() => setModal({ type: "help" })}
              >
                <CircleHelp size={19} />
              </button>
              <button
                className="profile-button"
                aria-label="Manage your squad"
                onClick={() => setModal({ type: "squad" })}
              >
                <Users size={18} />
              </button>
            </div>
          </div>
        </header>

        {page === "planner" && (
          <section className="hero">
            <motion.img
              className="hero-image"
              src={orbitalScene}
              alt="An armored Tenno overlooking a violet moon from a rocky ridge"
              initial={{ scale: 1.045, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />
            <div className="hero-shade" />
            <div className="content-width hero-content">
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.1 }}
              >
                <div className="eyebrow hero-eyebrow">
                  <span className="eyebrow-line" />
                  LESS GUESSWORK. MORE GOOD RUNS.
                </div>
                <h1>
                  Your squad. <span>The right mission.</span>
                </h1>
                <p>
                  One player's best. Five players' lowest. A better run for
                  everyone.
                </p>
                <div className="hero-actions">
                  <button
                    className="button button-primary"
                    onClick={() => openMission()}
                  >
                    <Plus size={18} />
                    Add mission
                  </button>
                  <button
                    className="button button-ghost"
                    onClick={() => setModal({ type: "help" })}
                  >
                    How it works
                    <ArrowUpRight size={16} />
                  </button>
                </div>
              </motion.div>
            </div>
          </section>
        )}

        <main className="content-width main-content" id="main-content">
          {page === "scores" ? (
            <ScoreReference
              scores={state.scores}
              lastSynced={state.lastSynced}
              syncing={syncing}
              error={syncError}
              onSync={syncScores}
              onReset={restoreScores}
            />
          ) : (
            <>
              <motion.div
                className="workspace"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.2 }}
              >
                <MissionBoard
                  key={boardKey}
                  state={state}
                  tab={tab}
                  onTab={setTab}
                  rankedRuns={rankedRuns}
                  currentRun={currentRun}
                  canRank={canRank}
                  selectionMessage={selectionMessage}
                  runSelected={runSelected}
                  onAdd={openMission}
                  onEdit={(mission) => setModal({ type: "mission", mission })}
                  onDelete={(mission) => setModal({ type: "delete", mission })}
                  onSquad={() => setModal({ type: "squad" })}
                  onPriority={setPriority}
                  onTie={(playerId, missionId) => {
                    if (!currentRun) return;
                    setTieChoices((current) => ({
                      ...current,
                      [`${currentRun.priority.id}:${playerId}`]: missionId,
                    }));
                    setState((current) => ({ ...current, savedRun: null }));
                  }}
                  onSelect={(run) => setModal({ type: "run", run })}
                />
                <SquadPanel
                  state={state}
                  canRank={canRank}
                  generating={generating}
                  selectionMessage={selectionMessage}
                  onManage={() => setModal({ type: "squad" })}
                  onTogglePlayer={togglePlayer}
                  onPriority={setPriority}
                  onSettings={() =>
                    setState((current) => ({
                      ...current,
                      includeSettings: !current.includeSettings,
                      savedRun: null,
                    }))
                  }
                  onHelp={() => setModal({ type: "help" })}
                  onGenerate={generateRun}
                />
              </motion.div>
              <div className="workspace-caption">
                <div className="source-caption">
                  <FileSpreadsheet size={15} />
                  <span>
                    {state.lastSynced
                      ? "Google Sheets scores"
                      : "Using provided scores"}
                  </span>
                  <span className="caption-dot" />
                  <button
                    className="text-button"
                    onClick={() => setPage("scores")}
                  >
                    View score reference
                    <ArrowUpRight size={13} />
                  </button>
                </div>
                <span
                  className={`save-caption ${!savingWorks ? "warning-text" : ""}`}
                >
                  <CheckCheck size={15} />
                  {savingWorks
                    ? "Auto-saved on this device"
                    : "Storage unavailable. Export to save."}
                </span>
              </div>
              {state.isDemo && (
                <div className="demo-notice">
                  <Info size={15} />
                  <p>
                    A little inspiration to get you started.{" "}
                    <span>You're exploring a demo squad.</span>
                  </p>
                  <button
                    className="text-button"
                    onClick={() => setModal({ type: "reset" })}
                  >
                    Make it yours
                    <ArrowRight size={14} />
                  </button>
                </div>
              )}
            </>
          )}
        </main>

        <footer className="site-footer content-width">
          <div>
            <Brand compact />
            <span>Plan together. Run better.</span>
          </div>
          <span className="footer-note">
            Built for Tenno. No account required.
            <button className="text-button html-download" onClick={exportHtml}>
              <Download size={12} />
              Download HTML
            </button>
            <span className="footer-version">V 1.0</span>
          </span>
        </footer>

        {modal?.type === "mission" && (
          <MissionForm
            state={state}
            defaultType={modal.defaultType}
            existing={modal.mission}
            key={modal.mission?.id ?? "new"}
            onSubmit={saveMission}
            onClose={() => setModal(null)}
          />
        )}
        {modal?.type === "squad" && (
          <SquadManager
            state={state}
            onClose={() => setModal(null)}
            onAdd={addPlayer}
            onRename={renamePlayer}
            onRemove={removePlayer}
            onReset={() => setModal({ type: "reset" })}
            onExport={exportSquad}
            onImport={importSquad}
          />
        )}
        {modal?.type === "help" && <Help onClose={() => setModal(null)} />}
        {modal?.type === "reset" && (
          <Modal
            title="A fresh start for your squad."
            description="Clear the current players and missions, and make this space yours."
            onClose={() => setModal(null)}
          >
            <div className="reset-content">
              <p>
                This removes all {state.players.length} players and{" "}
                {state.missions.length} missions from this device. Your score
                reference stays in place.
              </p>
              <button className="text-button" onClick={exportSquad}>
                <Download size={15} />
                Export a backup first
              </button>
            </div>
            <div className="modal-actions">
              <button
                className="button button-secondary"
                onClick={() => setModal(null)}
              >
                Keep my squad
              </button>
              <button className="button button-primary" onClick={resetSquad}>
                Start fresh
                <ArrowRight size={16} />
              </button>
            </div>
          </Modal>
        )}
        {modal?.type === "delete" && (
          <Modal
            title="Remove this mission?"
            description={`${modal.mission.type} for ${state.players.find((player) => player.id === modal.mission.playerId)?.name}`}
            onClose={() => setModal(null)}
          >
            <p className="confirmation-copy">
              The mission will be removed from your board, and your squad's
              rankings will update automatically.
            </p>
            <div className="modal-actions">
              <button
                className="button button-secondary"
                onClick={() => setModal(null)}
              >
                Keep mission
              </button>
              <button
                className="button button-danger"
                onClick={() => {
                  const id = modal.mission.id;
                  setState((current) => ({
                    ...current,
                    missions: current.missions.filter(
                      (mission) => mission.id !== id,
                    ),
                    savedRun: null,
                  }));
                  setModal(null);
                  notify("Mission removed. Rankings updated.");
                }}
              >
                <Trash2 size={16} />
                Remove mission
              </button>
            </div>
          </Modal>
        )}
        {modal?.type === "run" && (
          <Modal
            title={
              runSelected
                ? "Your squad is ready."
                : "This could be your next run."
            }
            description={`The best for ${modal.run.priority.name}. The lowest for everyone else.`}
            onClose={() => setModal(null)}
          >
            <div className="selected-run-list">
              {modal.run.picks.map((pick) => (
                <div key={pick.player.id}>
                  <Avatar player={pick.player} small />
                  <span>
                    <strong>
                      {pick.player.name}
                      {pick.isPriority && (
                        <Star size={11} fill="currentColor" />
                      )}
                    </strong>
                    <small>
                      {pick.mission.type}
                      {state.includeSettings && (
                        <>
                          {[pick.mission.setting1, pick.mission.setting2]
                            .filter(Boolean)
                            .map((setting) => (
                              <Fragment key={setting}> / {setting}</Fragment>
                            ))}
                        </>
                      )}
                    </small>
                  </span>
                  <b>{formatScore(pick.score)}</b>
                </div>
              ))}
            </div>
            <div className="squad-data-actions">
              <button
                className="button button-secondary button-small"
                onClick={() => copyRun(modal.run)}
              >
                <Copy size={14} />
                Copy run
              </button>
              <button
                className="button button-secondary button-small"
                onClick={() =>
                  downloadFile(
                    "voidline-run.txt",
                    runText(modal.run, state.includeSettings),
                    "text/plain",
                  )
                }
              >
                <Download size={14} />
                Download plan
              </button>
            </div>
            <button
              className="button button-primary full-width"
              onClick={() => {
                setState((current) => ({
                  ...current,
                  savedRun: {
                    priorityId: modal.run.priority.id,
                    missionIds: modal.run.picks.map((pick) => pick.mission.id),
                    createdAt: new Date().toISOString(),
                  },
                }));
                setModal(null);
                notify("Run selected. Time to bring your squad together.");
              }}
            >
              <CheckCheck size={17} />
              {runSelected ? "All set" : "Confirm this run"}
              <ArrowRight size={16} />
            </button>
            <p className="privacy-note text-center">
              A plan for your squad. This does not launch the game.
            </p>
          </Modal>
        )}

        <Notification
          toast={toast}
          modalKind={modal?.type}
          onDismiss={() => setToast(null)}
        />
      </div>
    </MotionConfig>
  );
}
