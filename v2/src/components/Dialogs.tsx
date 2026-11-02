import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Download,
  Info,
  Layers3,
  Pencil,
  Plus,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import { formatScore, missionScore, uid } from "../lib/planner";
import type { Mission, PlannerState, Player } from "../lib/planner";
import { Avatar, MissionIcon, Modal } from "./ui";

export function MissionForm({
  state,
  existing,
  defaultType,
  onSubmit,
  onClose,
}: {
  state: PlannerState;
  existing?: Mission;
  defaultType?: string;
  onSubmit: (mission: Mission) => string | null;
  onClose: () => void;
}) {
  const [playerId, setPlayerId] = useState(
    existing?.playerId ?? (state.priorityId || state.players[0]?.id || ""),
  );
  const [type, setType] = useState(
    existing?.type ?? defaultType ?? state.scores.missions[0].name,
  );
  const [setting1, setSetting1] = useState(existing?.setting1 ?? "");
  const [setting2, setSetting2] = useState(existing?.setting2 ?? "");
  const [advanced, setAdvanced] = useState(
    Boolean(existing?.setting1 || existing?.setting2),
  );
  const [error, setError] = useState("");
  const preview: Mission = {
    id: existing?.id ?? "",
    playerId,
    type,
    setting1,
    setting2,
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!playerId) {
      setError("Choose a player for this mission.");
      return;
    }
    const result = onSubmit({ ...preview, id: existing?.id ?? uid() });
    if (result) setError(result);
  };
  return (
    <Modal
      title={existing ? "Edit mission" : "Add a mission"}
      description="A possibility for you. A better plan for everyone."
      onClose={onClose}
    >
      <form onSubmit={submit} className="modal-form">
        <label className="field-label" htmlFor="mission-player">
          Assign to player
        </label>
        <div className="select-wrap">
          <Users size={16} />
          <select
            id="mission-player"
            value={playerId}
            onChange={(event) => setPlayerId(event.target.value)}
            required
          >
            {state.players.map((player) => (
              <option key={player.id} value={player.id}>
                {player.name}
              </option>
            ))}
          </select>
          <ChevronDown size={15} />
        </div>
        <span className="field-label field-spaced" id="mission-type-label">
          Mission type <span>Base score</span>
        </span>
        <div
          className="mission-options"
          role="group"
          aria-labelledby="mission-type-label"
        >
          {state.scores.missions.map((entry) => (
            <button
              type="button"
              key={entry.name}
              aria-pressed={type === entry.name}
              className={`mission-option ${type === entry.name ? "selected" : ""}`}
              onClick={() => setType(entry.name)}
            >
              <MissionIcon type={entry.name} small />
              <span>
                {entry.name}
                <small>{formatScore(entry.score)}</small>
              </span>
              {type === entry.name && <Check size={15} />}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="advanced-toggle"
          aria-expanded={advanced}
          onClick={() => setAdvanced(!advanced)}
        >
          <Layers3 size={16} />
          <span>
            Additional settings <small>Optional</small>
          </span>
          <ChevronDown size={16} className={advanced ? "rotate-180" : ""} />
        </button>
        <AnimatePresence initial={false}>
          {advanced && (
            <motion.div
              className="advanced-fields"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
            >
              <label className="field-label" htmlFor="setting-one">
                Setting 1 <span>G1:H5</span>
              </label>
              <div className="select-wrap">
                <select
                  id="setting-one"
                  value={setting1}
                  onChange={(event) => setSetting1(event.target.value)}
                >
                  <option value="">None</option>
                  {state.scores.setting1.map((entry) => (
                    <option key={entry.name} value={entry.name}>
                      {entry.name} ({formatScore(entry.score)})
                    </option>
                  ))}
                </select>
                <ChevronDown size={15} />
              </div>
              <label className="field-label field-spaced" htmlFor="setting-two">
                Setting 2 <span>J1:K14</span>
              </label>
              <div className="select-wrap">
                <select
                  id="setting-two"
                  value={setting2}
                  onChange={(event) => setSetting2(event.target.value)}
                >
                  <option value="">None</option>
                  {state.scores.setting2.map((entry) => (
                    <option key={entry.name} value={entry.name}>
                      {entry.name} ({formatScore(entry.score)})
                    </option>
                  ))}
                </select>
                <ChevronDown size={15} />
              </div>
              <p className="field-hint">
                Saved with this mission. Turn on additional settings in the
                squad panel to include their scores.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="score-preview">
          <span>
            {state.includeSettings
              ? "Combined mission score"
              : "Base mission score"}
          </span>
          <strong>
            {formatScore(
              missionScore(preview, state.scores, state.includeSettings),
            )}
          </strong>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button
            type="button"
            className="button button-secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button type="submit" className="button button-primary">
            <Plus size={17} />
            {existing ? "Save changes" : "Add mission"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function SquadManager({
  state,
  onClose,
  onAdd,
  onRename,
  onRemove,
  onReset,
  onExport,
  onImport,
}: {
  state: PlannerState;
  onClose: () => void;
  onAdd: (name: string) => string | null;
  onRename: (id: string, name: string) => string | null;
  onRemove: (id: string) => void;
  onReset: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
}) {
  const [name, setName] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  function add(event: FormEvent) {
    event.preventDefault();
    const result = onAdd(name);
    setError(result ?? "");
    if (!result) setName("");
  }
  function rename(player: Player) {
    const result = onRename(player.id, drafts[player.id] ?? player.name);
    setError(result ?? "");
    if (!result)
      setDrafts((current) => {
        const next = { ...current };
        delete next[player.id];
        return next;
      });
  }
  return (
    <Modal
      title="Make it your squad."
      description="Add your players, then choose six for the next run."
      onClose={onClose}
    >
      <form onSubmit={add} className="add-player-form">
        <label className="field-label" htmlFor="new-player">
          Player name
        </label>
        <div className="input-action">
          <input
            id="new-player"
            placeholder="Enter an in-game name"
            maxLength={32}
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            autoComplete="off"
          />
          <button
            type="submit"
            className="button button-primary"
            disabled={state.players.length >= 100}
          >
            <Plus size={17} />
            Add player
          </button>
        </div>
      </form>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="manage-list">
        {state.players.length === 0 ? (
          <p className="field-hint">
            Your squad is a blank canvas. Add your first player above.
          </p>
        ) : (
          state.players.map((player) => (
            <div className="manage-player-wrap" key={player.id}>
              <div className="manage-player">
                <Avatar player={player} />
                <div className="manage-player-name">
                  <input
                    aria-label={`Name for ${player.name}`}
                    value={drafts[player.id] ?? player.name}
                    maxLength={32}
                    onChange={(event) =>
                      setDrafts({ ...drafts, [player.id]: event.target.value })
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") rename(player);
                    }}
                  />
                  <small>
                    {
                      state.missions.filter(
                        (mission) => mission.playerId === player.id,
                      ).length
                    }{" "}
                    missions
                  </small>
                </div>
                {drafts[player.id] !== undefined &&
                drafts[player.id] !== player.name ? (
                  <button
                    className="icon-button"
                    aria-label={`Save name for ${player.name}`}
                    onClick={() => rename(player)}
                  >
                    <Check size={17} />
                  </button>
                ) : (
                  <Pencil className="muted-icon" size={14} />
                )}
                <button
                  className="icon-button danger-hover"
                  aria-label={`Remove ${player.name}`}
                  onClick={() =>
                    setRemoving(removing === player.id ? "" : player.id)
                  }
                >
                  <Trash2 size={16} />
                </button>
              </div>
              {removing === player.id && (
                <div className="inline-confirm">
                  <p>Remove {player.name} and their missions?</p>
                  <div>
                    <button
                      className="text-button"
                      onClick={() => setRemoving("")}
                    >
                      Cancel
                    </button>
                    <button
                      className="text-button danger-text"
                      onClick={() => {
                        onRemove(player.id);
                        setRemoving("");
                      }}
                    >
                      Remove player
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
      <div className="squad-data-actions">
        <button
          className="button button-secondary button-small"
          onClick={onExport}
        >
          <Download size={15} />
          Export squad
        </button>
        <button
          className="button button-secondary button-small"
          onClick={() => fileRef.current?.click()}
        >
          <Upload size={15} />
          Import squad
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          className="sr-only"
          aria-label="Import a Voidline squad JSON file"
          tabIndex={-1}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onImport(file);
            event.target.value = "";
          }}
        />
      </div>
      <div className="manage-bottom">
        <button className="text-button danger-text" onClick={onReset}>
          Start a new squad
        </button>
        <button className="button button-primary" onClick={onClose}>
          Done
          <Check size={16} />
        </button>
      </div>
    </Modal>
  );
}

export function Help({ onClose }: { onClose: () => void }) {
  return (
    <Modal
      title="One best. Five lowest."
      description="A little less guesswork before you head out."
      onClose={onClose}
    >
      <div className="help-steps">
        <div>
          <span>01</span>
          <section>
            <h3>Bring your six.</h3>
            <p>
              Add your players and enter the missions available to each of them.
              Matching mission types show every player who has them.
            </p>
          </section>
        </div>
        <div>
          <span>02</span>
          <section>
            <h3>Give someone the spotlight.</h3>
            <p>
              Star a priority player. They get their highest-scoring available
              mission; the other five get their lowest-scoring available
              mission.
            </p>
          </section>
        </div>
        <div>
          <span>03</span>
          <section>
            <h3>Find your run.</h3>
            <p>
              Generate a plan, review all six picks, and select the run. Compare
              priorities to see the largest difference between a player's best
              score and the other five's average.
            </p>
          </section>
        </div>
      </div>
      <div className="help-note">
        <Info size={18} />
        <p>
          <strong>A note on scores</strong>"Best" means the highest number;
          "lowest" means the lowest number, not a claim about difficulty.
          Settings are off by default. When enabled, both setting scores are
          added to the mission's base score. Ties are kept visible.
        </p>
      </div>
      <p className="privacy-note">
        Your squad is saved in this browser, not to Google Sheets. Export a
        squad to share it or move devices. Live score refresh requires a
        publicly readable sheet.
      </p>
      <button className="button button-primary full-width" onClick={onClose}>
        Let's plan
        <ArrowRight size={17} />
      </button>
    </Modal>
  );
}
