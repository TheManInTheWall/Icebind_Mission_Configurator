import React, { useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Flame,
  Pencil,
  Plus,
  SlidersHorizontal,
  Sparkles,
  Star,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { SheetWeights } from '../data/sheetData';
import {
  ScoringMode,
  SquadPlan,
  SquadUser,
  UserMission,
  formatScore,
  scoreUserMission,
} from '../utils/ranking';
import { BindChip, MissionTag, getMissionStyle } from './MissionBadges';

interface MissionEntryPanelProps {
  users: SquadUser[];
  missions: UserMission[];
  weights: SheetWeights;
  mode: ScoringMode;
  plan: SquadPlan;
  editingMissionId: string | null;
  onSetEditingMissionId: (id: string | null) => void;
  onAddUserOnly: (userName: string) => void;
  onAddMissionForUserName: (
    userName: string,
    missionName: string,
    setting1?: string,
    setting2?: string
  ) => void;
  onAddMissionForUserId: (
    userId: string,
    missionName: string,
    setting1?: string,
    setting2?: string
  ) => void;
  onUpdateMission: (
    missionId: string,
    patch: Partial<Pick<UserMission, 'missionName' | 'setting1' | 'setting2'>>
  ) => void;
  onDeleteMission: (missionId: string) => void;
  onRestoreMission: (missionId: string) => void;
  onToggleUserInSquad: (userId: string) => void;
  onRenameUser: (userId: string, newName: string) => void;
  onDeleteUser: (userId: string) => void;
  onCreateSixDefaultUsers: () => void;
  onLoadSampleSquad: () => void;
  onSelectManualBest: (missionId: string) => void;
}

export const MissionEntryPanel: React.FC<MissionEntryPanelProps> = ({
  users,
  missions,
  weights,
  plan,
  editingMissionId,
  onSetEditingMissionId,
  onAddUserOnly,
  onAddMissionForUserName,
  onAddMissionForUserId,
  onUpdateMission,
  onDeleteMission,
  onRestoreMission,
  onToggleUserInSquad,
  onRenameUser,
  onDeleteUser,
  onCreateSixDefaultUsers,
  onLoadSampleSquad,
  onSelectManualBest,
}) => {
  const [userNameInput, setUserNameInput] = useState('');
  const [includeSettingsOnEntry, setIncludeSettingsOnEntry] = useState(false);
  const [entrySetting1, setEntrySetting1] = useState('');
  const [entrySetting2, setEntrySetting2] = useState('');
  const [renamingUserId, setRenamingUserId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [entryError, setEntryError] = useState<string | null>(null);

  const bestMissionId = plan.bestSelection?.mission.id ?? null;
  const burnMissionIds = new Set(
    plan.burnSlots
      .map((s) => s.selectedWorst?.mission.id)
      .filter((id): id is string => Boolean(id))
  );

  const handleQuickMissionSubmit = (missionName: string) => {
    const trimmed = userNameInput.trim();
    if (!trimmed) {
      setEntryError('Enter or select a user name first.');
      return;
    }
    setEntryError(null);
    onAddMissionForUserName(
      trimmed,
      missionName,
      includeSettingsOnEntry && entrySetting1 ? entrySetting1 : undefined,
      includeSettingsOnEntry && entrySetting2 ? entrySetting2 : undefined
    );
    if (includeSettingsOnEntry) {
      setEntrySetting1('');
      setEntrySetting2('');
    }
  };

  const handleAddUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = userNameInput.trim();
    if (!trimmed) return;
    setEntryError(null);
    onAddUserOnly(trimmed);
  };

  const startRename = (u: SquadUser) => {
    setRenamingUserId(u.id);
    setRenameDraft(u.name);
  };

  const commitRename = (userId: string) => {
    if (renameDraft.trim()) {
      onRenameUser(userId, renameDraft.trim());
    }
    setRenamingUserId(null);
  };

  const activeCount = users.filter((u) => u.inSquad).length;

  return (
    <div className="space-y-4">
      {/* Fast Mission Entry Card */}
      <div className="rounded-xl border border-slate-800/90 bg-[#0d131d] p-4 shadow-lg">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">
              1. Enter User Missions
            </h2>
            <p className="text-xs text-slate-400">
              Pick or type a user, then click a mission (add the 2 extra settings anytime).
            </p>
          </div>
          <span className="rounded-full border border-slate-700/80 bg-slate-900 px-2.5 py-0.5 font-mono text-xs text-slate-300">
            Squad: <strong className="text-cyan-300">{Math.min(activeCount, 6)}</strong>/6
          </span>
        </div>

        {/* User input */}
        <form onSubmit={handleAddUserSubmit} className="space-y-2.5">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">
              User / Player Name
            </label>
            <div className="relative flex gap-2">
              <input
                type="text"
                value={userNameInput}
                onChange={(e) => {
                  setUserNameInput(e.target.value);
                  if (entryError) setEntryError(null);
                }}
                placeholder="Type user name (e.g. Player1)..."
                className="w-full rounded-lg border border-slate-700/80 bg-[#080c12] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
              />
              {userNameInput && (
                <button
                  type="button"
                  onClick={() => setUserNameInput('')}
                  className="rounded-lg border border-slate-700 bg-slate-800/70 px-2.5 text-slate-400 hover:text-slate-200"
                  title="Clear input"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <button
                type="submit"
                disabled={!userNameInput.trim()}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/90 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-40"
                title="Add user slot (or simply click a mission button below)"
              >
                <UserPlus className="h-3.5 w-3.5 text-cyan-400" />
                <span>Add User</span>
              </button>
            </div>
          </div>

          {/* Quick-pick existing user pills */}
          {users.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-slate-500">Target user:</span>
              {users.map((u) => {
                const isSelected =
                  userNameInput.trim().toLowerCase() === u.name.toLowerCase();
                return (
                  <button
                    type="button"
                    key={u.id}
                    onClick={() => {
                      setUserNameInput(u.name);
                      setEntryError(null);
                    }}
                    className={`rounded-md border px-2 py-0.5 text-xs font-medium transition ${
                      isSelected
                        ? 'border-cyan-400 bg-cyan-500/20 text-cyan-100'
                        : 'border-slate-700/80 bg-slate-900/90 text-slate-300 hover:border-slate-600 hover:text-slate-100'
                    }`}
                  >
                    {u.name}
                  </button>
                );
              })}
            </div>
          )}

          {/* Optional Additional 2 Settings Toggle (Default OFF per prompt!) */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setIncludeSettingsOnEntry((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition ${
                includeSettingsOnEntry
                  ? 'border-indigo-400/50 bg-indigo-500/15 text-indigo-200'
                  : 'border-slate-800 bg-slate-900/70 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>
                {includeSettingsOnEntry
                  ? 'Additional 2 Settings Enabled (G1:H5 & J1:K14)'
                  : 'Optional: Include Additional 2 Settings Now (Off — Base Mission First)'}
              </span>
              {includeSettingsOnEntry ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>

            {includeSettingsOnEntry && (
              <div className="mt-2.5 grid grid-cols-1 gap-2 rounded-lg border border-slate-800 bg-[#080c12] p-2.5 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-indigo-300">
                    Setting 1 — Mission Bind (G1:H5)
                  </label>
                  <select
                    value={entrySetting1}
                    onChange={(e) => setEntrySetting1(e.target.value)}
                    className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100 focus:border-indigo-400 focus:outline-none"
                  >
                    <option value="">— None / Skip for now —</option>
                    {weights.setting1.map((opt) => (
                      <option key={opt.name} value={opt.name}>
                        {opt.name} ({formatScore(opt.score)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-medium text-purple-300">
                    Setting 2 — Tactical Bind (J1:K14)
                  </label>
                  <select
                    value={entrySetting2}
                    onChange={(e) => setEntrySetting2(e.target.value)}
                    className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100 focus:border-purple-400 focus:outline-none"
                  >
                    <option value="">— None / Skip for now —</option>
                    {weights.setting2.map((opt) => (
                      <option key={opt.name} value={opt.name}>
                        {opt.name} ({formatScore(opt.score)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {entryError && (
            <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-200">
              {entryError}
            </p>
          )}

          {/* 1-Click Mission Buttons (D1:E4) */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-300">
              Click Mission to Attach to User (`D1:E4`)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {weights.missions.map((m) => {
                const st = getMissionStyle(m.name);
                return (
                  <button
                    type="button"
                    key={m.name}
                    onClick={() => handleQuickMissionSubmit(m.name)}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-xs font-semibold transition active:scale-[0.99] ${st.buttonBg}`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Plus className="h-3.5 w-3.5 opacity-80" />
                      <span>{m.name}</span>
                    </span>
                    <span className="rounded bg-black/35 px-1.5 py-0.5 font-mono text-[11px] tabular-nums">
                      {formatScore(m.score)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </form>
      </div>

      {/* Empty State Helper if no users yet */}
      {users.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-800 bg-[#0b1019] p-6 text-center space-y-3">
          <Users className="mx-auto h-8 w-8 text-slate-500" />
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-slate-200">
              No Squad Users Entered Yet
            </h3>
            <p className="mx-auto max-w-md text-xs text-slate-400">
              Type a user name above and click a mission, create 6 blank squad slots, or load a
              6-player sample squad (with multiple Disruption holders) to test ranking immediately.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
            <button
              onClick={onCreateSixDefaultUsers}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/90 px-3.5 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-700"
            >
              <UserPlus className="h-3.5 w-3.5 text-cyan-400" />
              <span>Create 6 Blank Player Slots</span>
            </button>
            <button
              onClick={onLoadSampleSquad}
              className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-3.5 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/25"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Load 6-Player Sample Squad</span>
            </button>
          </div>
        </div>
      ) : (
        /* User Cards & Their Missions */
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Users & Attached Missions ({users.length} users)
            </h3>
            {users.length < 6 && (
              <button
                onClick={onCreateSixDefaultUsers}
                className="text-xs text-cyan-400 hover:text-cyan-300"
              >
                + Fill to 6 Squad Slots
              </button>
            )}
          </div>

          {users.map((user) => {
            const userMissions = missions.filter((m) => m.userId === user.id);
            const activeMissions = userMissions.filter(
              (m) => m.consumedRunNumber === undefined
            );
            const consumedMissions = userMissions.filter(
              (m) => m.consumedRunNumber !== undefined
            );

            return (
              <div
                key={user.id}
                className={`rounded-xl border transition ${
                  user.inSquad
                    ? 'border-slate-800 bg-[#0d131d]'
                    : 'border-slate-800/50 bg-[#090d14] opacity-70'
                }`}
              >
                {/* User Card Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 px-3.5 py-2.5">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onToggleUserInSquad(user.id)}
                      title={
                        user.inSquad
                          ? 'Active in 6-player squad (click to bench)'
                          : 'Benched (click to add to active 6-player squad)'
                      }
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide transition ${
                        user.inSquad
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/35'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {user.inSquad ? 'Squad' : 'Bench'}
                    </button>

                    {renamingUserId === user.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={renameDraft}
                          autoFocus
                          onChange={(e) => setRenameDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitRename(user.id);
                            if (e.key === 'Escape') setRenamingUserId(null);
                          }}
                          className="w-32 rounded border border-cyan-500 bg-slate-950 px-2 py-0.5 text-xs text-slate-100 focus:outline-none"
                        />
                        <button
                          onClick={() => commitRename(user.id)}
                          className="rounded bg-cyan-600 p-1 text-white hover:bg-cyan-500"
                        >
                          <Check className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span
                          onDoubleClick={() => startRename(user)}
                          className="text-sm font-semibold text-slate-100 cursor-pointer"
                          title="Double-click to rename user"
                        >
                          {user.name}
                        </span>
                        <button
                          onClick={() => startRename(user)}
                          className="rounded p-0.5 text-slate-500 hover:text-slate-300"
                          title="Rename user"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                      </div>
                    )}

                    <span className="font-mono text-[11px] text-slate-500">
                      ({activeMissions.length} active)
                    </span>
                  </div>

                  {/* Direct 1-click quick add buttons right on the user card */}
                  <div className="flex flex-wrap items-center gap-1">
                    {weights.missions.map((m) => {
                      const st = getMissionStyle(m.name);
                      const shortLabel =
                        m.name.length > 10
                          ? m.name
                              .split(' ')
                              .map((w) => w.slice(0, 4))
                              .join(' ')
                          : m.name.slice(0, 4);
                      return (
                        <button
                          key={m.name}
                          type="button"
                          onClick={() => onAddMissionForUserId(user.id, m.name)}
                          title={`Quick add ${m.name} (${formatScore(m.score)}) to ${user.name}`}
                          className={`rounded border px-1.5 py-0.5 text-[11px] font-medium transition ${st.buttonBg}`}
                        >
                          +{shortLabel}
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => onDeleteUser(user.id)}
                      title={`Remove ${user.name}`}
                      className="ml-1 rounded p-1 text-slate-500 hover:bg-rose-500/15 hover:text-rose-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* User's Missions */}
                <div className="divide-y divide-slate-800/60 px-3.5 py-2">
                  {activeMissions.length === 0 ? (
                    <p className="py-1.5 text-xs text-slate-500">
                      No active missions — click <code className="text-slate-400">+Disr</code>,{' '}
                      <code className="text-slate-400">+Surv</code>,{' '}
                      <code className="text-slate-400">+Exca</code>, or{' '}
                      <code className="text-slate-400">+Mob Defe</code> above to attach one.
                    </p>
                  ) : (
                    activeMissions.map((m) => {
                      const scored = scoreUserMission(m, user, weights);
                      const isBest = bestMissionId === m.id;
                      const isBurn = burnMissionIds.has(m.id);
                      const isEditing = editingMissionId === m.id;

                      return (
                        <div key={m.id} className="py-2 first:pt-1 last:pb-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <MissionTag
                                name={m.missionName}
                                score={scored.baseScore}
                                size="sm"
                              />

                              {m.setting1 && (
                                <BindChip
                                  label={m.setting1}
                                  score={scored.setting1Score}
                                  kind="S1"
                                />
                              )}
                              {m.setting2 && (
                                <BindChip
                                  label={m.setting2}
                                  score={scored.setting2Score}
                                  kind="S2"
                                />
                              )}

                              {scored.bindsCount > 0 && (
                                <span
                                  className="rounded bg-slate-800/90 px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-slate-300"
                                  title="Combined Sum (Mission + Entered Settings)"
                                >
                                  Σ {formatScore(scored.knownTotal)}
                                </span>
                              )}

                              {isBest && (
                                <span className="inline-flex items-center gap-1 rounded bg-cyan-500/20 border border-cyan-400/40 px-1.5 py-0.5 text-[10px] font-bold text-cyan-200">
                                  <Star className="h-2.5 w-2.5 fill-cyan-300 text-cyan-300" />
                                  RUN (BEST)
                                </span>
                              )}
                              {isBurn && (
                                <span className="inline-flex items-center gap-1 rounded bg-rose-500/15 border border-rose-400/30 px-1.5 py-0.5 text-[10px] font-bold text-rose-200">
                                  <Flame className="h-2.5 w-2.5 text-rose-300" />
                                  BURN (WORST)
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  onSetEditingMissionId(isEditing ? null : m.id)
                                }
                                className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] transition ${
                                  isEditing
                                    ? 'border-indigo-400 bg-indigo-500/20 text-indigo-100'
                                    : scored.bindsCount < 2
                                    ? 'border-slate-700/90 bg-slate-900 text-slate-300 hover:border-indigo-400/50 hover:text-indigo-200'
                                    : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
                                }`}
                                title="Attach or edit the 2 additional settings (G1:H5 & J1:K14)"
                              >
                                <SlidersHorizontal className="h-3 w-3" />
                                <span>
                                  {isEditing
                                    ? 'Close'
                                    : scored.bindsCount === 0
                                    ? '+ 2 Settings'
                                    : 'Edit Settings'}
                                </span>
                              </button>

                              {user.inSquad && !isBest && (
                                <button
                                  type="button"
                                  onClick={() => onSelectManualBest(m.id)}
                                  title="Pick this mission as the 1 Best mission to run"
                                  className="rounded border border-slate-800 bg-slate-900/70 px-1.5 py-0.5 text-[11px] text-slate-400 hover:border-cyan-500/40 hover:text-cyan-200"
                                >
                                  Pick Best
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => onDeleteMission(m.id)}
                                className="rounded p-1 text-slate-500 hover:bg-rose-500/15 hover:text-rose-300"
                                title="Delete mission"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Inline Drawer to Add/Edit the 2 Additional Settings */}
                          {isEditing && (
                            <div className="mt-2 grid grid-cols-1 gap-2 rounded-lg border border-indigo-500/30 bg-[#080c13] p-2.5 sm:grid-cols-3">
                              <div>
                                <label className="mb-1 block text-[10px] font-semibold uppercase text-cyan-300">
                                  Mission (D1:E4)
                                </label>
                                <select
                                  value={m.missionName}
                                  onChange={(e) =>
                                    onUpdateMission(m.id, {
                                      missionName: e.target.value,
                                    })
                                  }
                                  className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 focus:border-cyan-400 focus:outline-none"
                                >
                                  {weights.missions.map((opt) => (
                                    <option key={opt.name} value={opt.name}>
                                      {opt.name} ({formatScore(opt.score)})
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="mb-1 block text-[10px] font-semibold uppercase text-indigo-300">
                                  Setting 1 (G1:H5)
                                </label>
                                <select
                                  value={m.setting1 || ''}
                                  onChange={(e) =>
                                    onUpdateMission(m.id, {
                                      setting1: e.target.value || undefined,
                                    })
                                  }
                                  className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 focus:border-indigo-400 focus:outline-none"
                                >
                                  <option value="">— Not set —</option>
                                  {weights.setting1.map((opt) => (
                                    <option key={opt.name} value={opt.name}>
                                      {opt.name} ({formatScore(opt.score)})
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="mb-1 block text-[10px] font-semibold uppercase text-purple-300">
                                  Setting 2 (J1:K14)
                                </label>
                                <select
                                  value={m.setting2 || ''}
                                  onChange={(e) =>
                                    onUpdateMission(m.id, {
                                      setting2: e.target.value || undefined,
                                    })
                                  }
                                  className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 focus:border-purple-400 focus:outline-none"
                                >
                                  <option value="">— Not set —</option>
                                  {weights.setting2.map((opt) => (
                                    <option key={opt.name} value={opt.name}>
                                      {opt.name} ({formatScore(opt.score)})
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}

                  {/* Consumed missions in previous runs */}
                  {consumedMissions.length > 0 && (
                    <div className="pt-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] uppercase tracking-wider text-slate-500">
                          Used:
                        </span>
                        {consumedMissions.map((cm) => (
                          <button
                            key={cm.id}
                            type="button"
                            onClick={() => onRestoreMission(cm.id)}
                            title="Click to restore this consumed mission back to active pool"
                            className="inline-flex items-center gap-1 rounded border border-slate-800 bg-slate-900/40 px-1.5 py-0.5 text-[11px] text-slate-500 line-through hover:border-slate-700 hover:text-slate-300 hover:no-underline"
                          >
                            <span>
                              R#{cm.consumedRunNumber}: {cm.missionName}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
