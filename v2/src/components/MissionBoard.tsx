import { useEffect, useState } from "react";
import type { KeyboardEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowDown,
  ArrowDownUp,
  ArrowRight,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  Info,
  ListFilter,
  Orbit,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Star,
  Swords,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { formatScore, missionScore } from "../lib/planner";
import type { Mission, PlannerState, RankedRun } from "../lib/planner";
import { Avatar, MissionIcon } from "./ui";

export type BoardTab = "missions" | "ranked";
type Props = {
  state: PlannerState;
  tab: BoardTab;
  onTab: (tab: BoardTab) => void;
  rankedRuns: RankedRun[];
  currentRun?: RankedRun;
  canRank: boolean;
  selectionMessage: string;
  runSelected: boolean;
  onAdd: (type?: string) => void;
  onEdit: (mission: Mission) => void;
  onDelete: (mission: Mission) => void;
  onSquad: () => void;
  onPriority: (id: string) => void;
  onTie: (playerId: string, missionId: string) => void;
  onSelect: (run: RankedRun) => void;
};

export function MissionBoard({
  state,
  tab,
  onTab,
  rankedRuns,
  currentRun,
  canRank,
  selectionMessage,
  runSelected,
  onAdd,
  onEdit,
  onDelete,
  onSquad,
  onPriority,
  onTie,
  onSelect,
}: Props) {
  const [query, setQuery] = useState("");
  const [playerFilter, setPlayerFilter] = useState("all");
  const [expanded, setExpanded] = useState<string[]>([]);
  const [descending, setDescending] = useState(true);
  const [compare, setCompare] = useState(false);
  useEffect(() => {
    if (
      playerFilter !== "all" &&
      !state.players.some((player) => player.id === playerFilter)
    )
      setPlayerFilter("all");
  }, [state.players, playerFilter]);
  useEffect(() => {
    if (tab === "missions") setCompare(false);
  }, [tab]);
  const filtered = state.missions.filter((mission) => {
    const player = state.players.find((item) => item.id === mission.playerId);
    return (
      (playerFilter === "all" || mission.playerId === playerFilter) &&
      `${mission.type} ${player?.name} ${mission.setting1} ${mission.setting2}`
        .toLowerCase()
        .includes(query.toLowerCase().trim())
    );
  });
  const groups = state.scores.missions
    .map((entry) => ({
      ...entry,
      missions: filtered.filter((mission) => mission.type === entry.name),
    }))
    .filter((group) => group.missions.length)
    .sort((a, b) => (descending ? b.score - a.score : a.score - b.score));

  function navigateTabs(event: KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next =
      event.key === "Home"
        ? "missions"
        : event.key === "End"
          ? "ranked"
          : tab === "missions"
            ? "ranked"
            : "missions";
    onTab(next);
    document
      .getElementById(next === "missions" ? "missions-tab" : "ranked-tab")
      ?.focus();
  }

  return (
    <section className="mission-panel panel" id="mission-board">
      <div className="panel-heading">
        <div className="panel-title">
          <span className="title-icon">
            <Orbit size={20} />
          </span>
          <div>
            <h2>Mission board</h2>
            <p>Your squad's possibilities, all in one place.</p>
          </div>
        </div>
        <div className="board-search">
          <Search size={15} />
          <input
            aria-label="Search missions or players"
            placeholder="Search missions..."
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              onTab("missions");
            }}
          />
          {query && (
            <button
              aria-label="Clear search"
              className="search-clear"
              onClick={() => setQuery("")}
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>
      <div className="board-toolbar">
        <div
          className="board-tabs"
          role="tablist"
          aria-label="Mission views"
          onKeyDown={navigateTabs}
        >
          <button
            id="missions-tab"
            className={tab === "missions" ? "board-tab active" : "board-tab"}
            role="tab"
            aria-selected={tab === "missions"}
            tabIndex={tab === "missions" ? 0 : -1}
            aria-controls="missions-panel"
            onClick={() => onTab("missions")}
          >
            All missions
            <span className="tab-count">{state.missions.length}</span>
          </button>
          <button
            id="ranked-tab"
            className={tab === "ranked" ? "board-tab active" : "board-tab"}
            role="tab"
            aria-selected={tab === "ranked"}
            tabIndex={tab === "ranked" ? 0 : -1}
            aria-controls="ranked-panel"
            onClick={() => onTab("ranked")}
          >
            <Sparkles size={14} />
            Ranked runs
            {rankedRuns.length > 0 && (
              <span className="tab-count">{rankedRuns.length}</span>
            )}
          </button>
        </div>
        {tab === "missions" ? (
          <div className="filter-select">
            <ListFilter size={14} />
            <select
              aria-label="Filter missions by player"
              value={playerFilter}
              onChange={(event) => setPlayerFilter(event.target.value)}
            >
              <option value="all">All players</option>
              {state.players.map((player) => (
                <option value={player.id} key={player.id}>
                  {player.name}
                </option>
              ))}
            </select>
            <ChevronDown size={13} />
          </div>
        ) : (
          <button
            className={`text-button compare-button ${compare ? "violet-text" : ""}`}
            onClick={() => setCompare(!compare)}
            disabled={!canRank}
          >
            <ArrowDownUp size={13} />
            {compare ? "View run" : "Compare priorities"}
          </button>
        )}
      </div>

      {tab === "missions" ? (
        <div role="tabpanel" id="missions-panel" aria-labelledby="missions-tab">
          <div className="mission-table-heading mission-grid">
            <span>MISSION TYPE</span>
            <span>AVAILABLE FOR</span>
            <button
              onClick={() => setDescending(!descending)}
              aria-label={`Sort base score ${descending ? "ascending" : "descending"}`}
            >
              BASE SCORE
              <ArrowDown size={11} className={descending ? "" : "rotate-180"} />
            </button>
            <span />
          </div>
          <div className="mission-table">
            {groups.length ? (
              groups.map((group) => {
                const owners = state.players.filter((player) =>
                  group.missions.some(
                    (mission) => mission.playerId === player.id,
                  ),
                );
                const isOpen = expanded.includes(group.name);
                return (
                  <div
                    className={`mission-group ${isOpen ? "is-open" : ""}`}
                    key={group.name}
                  >
                    <button
                      className="mission-row mission-grid"
                      aria-expanded={isOpen}
                      aria-label={`Show ${group.name} missions for ${owners.map((player) => player.name).join(", ")}`}
                      onClick={() =>
                        setExpanded((current) =>
                          isOpen
                            ? current.filter((name) => name !== group.name)
                            : [...current, group.name],
                        )
                      }
                    >
                      <span className="mission-name">
                        <MissionIcon type={group.name} />
                        <span>
                          <strong>{group.name}</strong>
                          <small>
                            {group.missions.length} available{" "}
                            {group.missions.length === 1
                              ? "mission"
                              : "missions"}
                          </small>
                        </span>
                      </span>
                      <span className="mission-owners">
                        <span className="avatar-stack">
                          {owners.slice(0, 4).map((player) => (
                            <Avatar key={player.id} player={player} small />
                          ))}
                          {owners.length > 4 && (
                            <span className="avatar avatar-small overflow-avatar">
                              +{owners.length - 4}
                            </span>
                          )}
                        </span>
                        <span className="owner-names">
                          {owners.map((player) => player.name).join(", ")}
                        </span>
                      </span>
                      <span
                        className={`mission-score ${group.name === "Disruption" ? "highest-score" : ""}`}
                      >
                        <strong>{formatScore(group.score)}</strong>
                        <span className="score-track">
                          <span
                            style={{
                              width: `${Math.min(100, (group.score / Math.max(...state.scores.missions.map((entry) => entry.score), 1)) * 100)}%`,
                            }}
                          />
                        </span>
                      </span>
                      <ChevronRight
                        size={16}
                        className={`row-chevron ${isOpen ? "rotate-90" : ""}`}
                      />
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          className="mission-details"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.24 }}
                        >
                          <div className="mission-details-inner">
                            {group.missions.map((mission) => {
                              const owner = state.players.find(
                                (player) => player.id === mission.playerId,
                              )!;
                              return (
                                <div
                                  className="mission-detail-row"
                                  key={mission.id}
                                >
                                  <Avatar player={owner} small />
                                  <div className="mission-detail-name">
                                    <strong>{owner.name}</strong>
                                    <span>
                                      {[mission.setting1, mission.setting2]
                                        .filter(Boolean)
                                        .join(" / ") || "Base mission only"}
                                    </span>
                                  </div>
                                  <span className="detail-score">
                                    {formatScore(
                                      missionScore(
                                        mission,
                                        state.scores,
                                        state.includeSettings,
                                      ),
                                    )}
                                  </span>
                                  <button
                                    className="icon-button"
                                    aria-label={`Edit ${mission.type} for ${owner.name}`}
                                    onClick={() => onEdit(mission)}
                                  >
                                    <Pencil size={14} />
                                  </button>
                                  <button
                                    className="icon-button danger-hover"
                                    aria-label={`Delete ${mission.type} for ${owner.name}`}
                                    onClick={() => onDelete(mission)}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              );
                            })}
                            <button
                              className="text-button add-another"
                              onClick={() => onAdd(group.name)}
                            >
                              <Plus size={14} />
                              Add another {group.name} mission
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            ) : (
              <div className="empty-state">
                <Orbit size={34} />
                <h3>
                  {state.missions.length
                    ? "No missions in this orbit."
                    : "Your next run starts here."}
                </h3>
                <p>
                  {state.missions.length
                    ? "Try another player or a different search."
                    : "Add your players and their available missions to get started."}
                </p>
                <button
                  className="button button-secondary button-small"
                  onClick={
                    state.missions.length
                      ? () => {
                          setQuery("");
                          setPlayerFilter("all");
                        }
                      : () => onAdd()
                  }
                >
                  {state.missions.length
                    ? "Clear filters"
                    : "Add your first mission"}
                  <ArrowRight size={14} />
                </button>
              </div>
            )}
          </div>
          <div className="board-footer">
            <span>
              <span className="small-status-dot" />
              {groups.length} mission types
              <span className="text-separator">/</span>
              {filtered.length} player entries
            </span>
            <button className="text-button" onClick={() => onAdd()}>
              <Plus size={14} />
              Add mission
            </button>
          </div>
        </div>
      ) : (
        <div role="tabpanel" id="ranked-panel" aria-labelledby="ranked-tab">
          {!currentRun ? (
            <div className="empty-state rank-empty">
              <Sparkles size={34} />
              <h3>A full squad. A smarter plan.</h3>
              <p>{selectionMessage}</p>
              <button
                className="button button-secondary button-small"
                onClick={onSquad}
              >
                Manage squad
                <Users size={15} />
              </button>
            </div>
          ) : compare ? (
            <div className="comparison">
              <div className="comparison-intro">
                <h3>Who gets the spotlight?</h3>
                <p>Ranked by best score minus the other five's average.</p>
              </div>
              <div className="comparison-labels">
                <span>PRIORITY PLAYER</span>
                <span>BEST</span>
                <span>OTHERS AVG.</span>
                <span>ADVANTAGE</span>
              </div>
              {rankedRuns.map((run, index) => (
                <button
                  className={`comparison-row ${run.priority.id === state.priorityId ? "selected" : ""}`}
                  key={run.priority.id}
                  onClick={() => {
                    onPriority(run.priority.id);
                    setCompare(false);
                  }}
                >
                  <span className="compare-player">
                    <small>{String(index + 1).padStart(2, "0")}</small>
                    <Avatar player={run.priority} small />
                    <strong>{run.priority.name}</strong>
                    {index === 0 && <Star size={12} />}
                  </span>
                  <span>{formatScore(run.priorityScore)}</span>
                  <span>{formatScore(run.otherAverage)}</span>
                  <strong>
                    {run.advantage > 0 ? "+" : ""}
                    {formatScore(run.advantage)}
                    <ChevronRight size={14} />
                  </strong>
                </button>
              ))}
            </div>
          ) : (
            <div className="run-view">
              <div className="run-intro">
                <div>
                  <span className="run-eyebrow">
                    <Star size={12} fill="currentColor" />
                    THE SPOTLIGHT IS ON {currentRun.priority.name.toUpperCase()}
                  </span>
                  <h3>One squad. Six smart picks.</h3>
                </div>
                <span className="ready-label">
                  <Check size={12} />
                  {runSelected ? "Run selected" : "Ready to run"}
                </span>
              </div>
              <div className="run-table-heading">
                <span>PLAYER</span>
                <span>MISSION</span>
                <span>SCORE</span>
              </div>
              {currentRun.picks.map((pick) => (
                <div
                  key={pick.player.id}
                  className={`run-row ${pick.isPriority ? "priority-pick" : ""}`}
                >
                  <span className="run-player">
                    <Avatar player={pick.player} small />
                    <span>
                      <strong>{pick.player.name}</strong>
                      <small>
                        {pick.isPriority
                          ? "Their best mission"
                          : "Their lowest mission"}
                      </small>
                    </span>
                    {pick.isPriority && <Star size={12} fill="currentColor" />}
                  </span>
                  <span className="run-mission">
                    <MissionIcon type={pick.mission.type} small />
                    <span>
                      {pick.alternatives.length > 1 ? (
                        <>
                          <select
                            aria-label={`Tied missions for ${pick.player.name}`}
                            value={pick.mission.id}
                            onChange={(event) =>
                              onTie(pick.player.id, event.target.value)
                            }
                          >
                            {pick.alternatives.map((mission) => (
                              <option key={mission.id} value={mission.id}>
                                {mission.type}
                                {mission.setting1
                                  ? ` / ${mission.setting1}`
                                  : ""}
                                {mission.setting2
                                  ? ` / ${mission.setting2}`
                                  : ""}
                              </option>
                            ))}
                          </select>
                          <small>{pick.alternatives.length} tied options</small>
                        </>
                      ) : (
                        <>
                          <strong>{pick.mission.type}</strong>
                          {state.includeSettings &&
                            (pick.mission.setting1 ||
                              pick.mission.setting2) && (
                              <small>
                                {[pick.mission.setting1, pick.mission.setting2]
                                  .filter(Boolean)
                                  .join(" / ")}
                              </small>
                            )}
                        </>
                      )}
                    </span>
                  </span>
                  <strong className="run-score">
                    {formatScore(pick.score)}
                  </strong>
                </div>
              ))}
              <div className="run-footer">
                <p>
                  <Info size={14} />
                  {state.includeSettings
                    ? "Base + additional settings"
                    : "Base mission scores only"}
                </p>
                <button
                  className={`button ${runSelected ? "button-secondary" : "button-primary"} button-small`}
                  onClick={() => onSelect(currentRun)}
                >
                  {runSelected ? (
                    <CheckCheck size={15} />
                  ) : (
                    <Swords size={15} />
                  )}
                  {runSelected ? "View selected run" : "Select this run"}
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
