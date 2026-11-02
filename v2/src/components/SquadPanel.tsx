import {
  ArrowRight,
  Check,
  Info,
  Layers3,
  LoaderCircle,
  Plus,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import type { PlannerState } from "../lib/planner";
import { Avatar } from "./ui";

type Props = {
  state: PlannerState;
  canRank: boolean;
  generating: boolean;
  selectionMessage: string;
  onManage: () => void;
  onTogglePlayer: (id: string) => void;
  onPriority: (id: string) => void;
  onSettings: () => void;
  onHelp: () => void;
  onGenerate: () => void;
};

export function SquadPanel({
  state,
  canRank,
  generating,
  selectionMessage,
  onManage,
  onTogglePlayer,
  onPriority,
  onSettings,
  onHelp,
  onGenerate,
}: Props) {
  return (
    <aside className="squad-panel panel">
      <div className="squad-heading">
        <div>
          <h2>
            Your squad
            <span className="squad-count">
              {state.selectedIds.length}
              <span>/ 6</span>
            </span>
          </h2>
          <p>Choose six. Give one the spotlight.</p>
        </div>
        <button
          className="icon-button"
          aria-label="Manage squad"
          title="Manage squad"
          onClick={onManage}
        >
          <Users size={18} />
          <Plus size={9} className="manage-plus" />
        </button>
      </div>
      <div className="squad-list">
        {state.players.length ? (
          state.players.map((player) => {
            const selected = state.selectedIds.includes(player.id);
            const priority = state.priorityId === player.id;
            const count = state.missions.filter(
              (mission) => mission.playerId === player.id,
            ).length;
            return (
              <div
                className={`squad-player ${priority ? "is-priority" : ""} ${!selected ? "not-selected" : ""}`}
                key={player.id}
              >
                <label className="player-selection">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => onTogglePlayer(player.id)}
                    aria-label={`Include ${player.name} in squad`}
                  />
                  <span className="custom-checkbox">
                    <Check size={11} strokeWidth={2.7} />
                  </span>
                  <Avatar player={player} />
                  <span className="squad-player-info">
                    <strong>
                      {player.name}
                      {player.id === "player-1" && state.isDemo && (
                        <small>(you)</small>
                      )}
                    </strong>
                    <span>
                      {count} {count === 1 ? "mission" : "missions"} available
                    </span>
                  </span>
                </label>
                <button
                  className={`priority-button ${priority ? "active" : ""}`}
                  aria-label={`Make ${player.name} the priority player`}
                  aria-pressed={priority}
                  title={priority ? "Priority player" : "Make priority player"}
                  onClick={() => onPriority(player.id)}
                >
                  <Star size={16} fill={priority ? "currentColor" : "none"} />
                </button>
              </div>
            );
          })
        ) : (
          <div className="empty-squad">
            <Users size={30} />
            <p>Good runs start with good company.</p>
            <button className="text-button" onClick={onManage}>
              <Plus size={14} />
              Add your players
            </button>
          </div>
        )}
      </div>
      <div className="squad-controls">
        <div className="settings-toggle-row">
          <span>
            <Layers3 size={15} />
            Include additional settings
            <button
              className="inline-help"
              aria-label="Explain additional settings"
              onClick={onHelp}
            >
              <Info size={13} />
            </button>
          </span>
          <button
            role="switch"
            aria-checked={state.includeSettings}
            aria-label="Include additional settings in ranking"
            className={`switch ${state.includeSettings ? "on" : ""}`}
            onClick={onSettings}
          >
            <span />
          </button>
        </div>
        <button
          className="button button-primary generate-button"
          disabled={!canRank || generating}
          onClick={onGenerate}
        >
          {generating ? (
            <LoaderCircle size={17} className="spin" />
          ) : (
            <Sparkles size={17} />
          )}
          <span>
            {generating ? "Finding your best run..." : "Generate best run"}
          </span>
          {!generating && <ArrowRight size={16} />}
        </button>
        <p className={`ranking-hint ${!canRank ? "not-ready" : ""}`}>
          {selectionMessage}
        </p>
      </div>
    </aside>
  );
}
