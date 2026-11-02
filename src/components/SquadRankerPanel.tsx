import React, { useState } from 'react';
import {
  Award,
  Check,
  CheckCircle2,
  Copy,
  Flame,
  History,
  RotateCcw,
  SlidersHorizontal,
  Star,
  Undo2,
  Users,
} from 'lucide-react';
import { SheetWeights } from '../data/sheetData';
import { formatPlanForChat } from '../utils/exportHtml';
import {
  CompletedRunRecord,
  ScoringMode,
  SquadPlan,
  UserMission,
  formatScore,
  getDisplayScoreText,
} from '../utils/ranking';
import { BindChip, MissionTag } from './MissionBadges';

interface SquadRankerPanelProps {
  plan: SquadPlan;
  weights: SheetWeights;
  mode: ScoringMode;
  onChangeMode: (mode: ScoringMode) => void;
  onSelectManualBest: (missionId: string | null) => void;
  onSelectManualBurn: (userId: string, missionId: string | null) => void;
  onUpdateMission: (
    missionId: string,
    patch: Partial<Pick<UserMission, 'missionName' | 'setting1' | 'setting2'>>
  ) => void;
  onCompleteCurrentRun: () => void;
  completedRuns: CompletedRunRecord[];
  onUndoRun: (runId: string) => void;
}

export const SquadRankerPanel: React.FC<SquadRankerPanelProps> = ({
  plan,
  weights,
  mode,
  onChangeMode,
  onSelectManualBest,
  onSelectManualBurn,
  onUpdateMission,
  onCompleteCurrentRun,
  completedRuns,
  onUndoRun,
}) => {
  const [copied, setCopied] = useState(false);
  const [compareTiedSettingsOpen, setCompareTiedSettingsOpen] = useState(false);

  const handleCopy = async () => {
    const text = formatPlanForChat(plan, mode);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback textarea copy
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  const best = plan.bestSelection;
  // Users who share the currently active Best mission type (or top mission type overall)
  const sharedBestCandidates =
    plan.usersWithSelectedMissionType.length > 1
      ? plan.usersWithSelectedMissionType
      : plan.usersWithTopMissionType.length > 1
      ? plan.usersWithTopMissionType
      : [];

  const sharedMissionLabel =
    plan.usersWithSelectedMissionType.length > 1 && best
      ? best.mission.missionName
      : plan.topMissionTypeName || '';

  const totalSelectedCount =
    (best ? 1 : 0) + plan.burnSlots.filter((s) => s.selectedWorst !== null).length;

  return (
    <div className="space-y-4">
      {/* Scoring Mode Control Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800/90 bg-[#0d131d] px-4 py-3 shadow-lg">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">
            2. Squad Mission Ranker (1 Best + 5 Worst)
          </h2>
          <p className="text-xs text-slate-400">
            Picks the <span className="text-cyan-300 font-medium">best mission</span> for 1 user to run, and the{' '}
            <span className="text-rose-300 font-medium">worst mission</span> for the 5 others to burn.
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="inline-flex rounded-lg border border-slate-800 bg-[#080c12] p-0.5 text-xs">
          <button
            type="button"
            onClick={() => onChangeMode('mission-first')}
            className={`rounded-md px-2.5 py-1 font-medium transition ${
              mode === 'mission-first'
                ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/35'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Rank by base Mission Type (D1:E4) first; use the 2 extra settings as tie-breakers"
          >
            Mission First (Tie-Break Settings)
          </button>
          <button
            type="button"
            onClick={() => onChangeMode('combined')}
            className={`rounded-md px-2.5 py-1 font-medium transition ${
              mode === 'combined'
                ? 'bg-indigo-500/20 text-indigo-200 border border-indigo-400/35'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Rank by combined sum of Mission + Setting 1 + Setting 2"
          >
            Combined Score (Σ All 3)
          </button>
        </div>
      </div>

      {/* Active 6-Player Squad Selection Card */}
      <div className="rounded-xl border border-slate-800/90 bg-[#0d131d] p-4 shadow-lg space-y-4">
        {!best ? (
          <div className="py-8 text-center">
            <Award className="mx-auto mb-2 h-8 w-8 text-slate-600" />
            <p className="text-sm font-medium text-slate-300">
              Waiting for Missions
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Enter missions for your users on the left to automatically rank and select 1 Best + 5 Worst.
            </p>
          </div>
        ) : (
          <>
            {/* SLOT 1: THE 1 "BEST" MISSION TO RUN */}
            <div className="rounded-xl border border-cyan-500/35 bg-gradient-to-br from-cyan-950/35 via-[#0b1420] to-[#0a1019] p-3.5">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-md bg-cyan-500/20 border border-cyan-400/40 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-cyan-200">
                    <Star className="h-3 w-3 fill-cyan-300 text-cyan-300" />
                    1x Best Mission — Vote & Run
                  </span>
                  {plan.isManualBest ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-amber-300">
                      <span>(Manual selection)</span>
                      <button
                        type="button"
                        onClick={() => onSelectManualBest(null)}
                        className="inline-flex items-center gap-0.5 underline hover:text-amber-200"
                      >
                        <RotateCcw className="h-2.5 w-2.5" />
                        Auto
                      </button>
                    </span>
                  ) : (
                    <span className="text-[11px] text-cyan-300/80">
                      Auto-ranked optimal runner
                    </span>
                  )}
                </div>

                <span className="rounded-md border border-cyan-400/30 bg-black/35 px-2.5 py-0.5 font-mono text-xs font-semibold tabular-nums text-cyan-200">
                  Score: {getDisplayScoreText(best, mode)}
                </span>
              </div>

              {/* Selected Best Runner Details */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-cyan-500/20 bg-black/25 px-3.5 py-2.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-base font-bold text-white">
                    {best.user.name}
                  </span>
                  <MissionTag
                    name={best.mission.missionName}
                    score={best.baseScore}
                    size="lg"
                  />
                  {best.mission.setting1 && (
                    <BindChip
                      label={best.mission.setting1}
                      score={best.setting1Score}
                      kind="S1"
                    />
                  )}
                  {best.mission.setting2 && (
                    <BindChip
                      label={best.mission.setting2}
                      score={best.setting2Score}
                      kind="S2"
                    />
                  )}
                </div>

                {best.bindsCount < 2 && (
                  <button
                    type="button"
                    onClick={() => setCompareTiedSettingsOpen((v) => !v)}
                    className="inline-flex items-center gap-1 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-xs font-medium text-cyan-200 hover:bg-cyan-500/20"
                  >
                    <SlidersHorizontal className="h-3 w-3" />
                    <span>
                      {compareTiedSettingsOpen ? 'Hide Settings' : '+ Add / Compare 2 Settings'}
                    </span>
                  </button>
                )}
              </div>

              {/* PROMINENT MULTI-USER DISPLAY WHEN >1 USER HAS THE TOP MISSION (e.g. DISRUPTION) */}
              {sharedBestCandidates.length > 1 && (
                <div className="mt-3 rounded-lg border border-cyan-400/30 bg-cyan-950/25 p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-200">
                      <Users className="h-3.5 w-3.5 text-cyan-300" />
                      <span>
                        {sharedBestCandidates.length} Users have{' '}
                        <span className="underline decoration-cyan-400/60">
                          {sharedMissionLabel.toUpperCase()}
                        </span>{' '}
                        — click any user to select who runs it:
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setCompareTiedSettingsOpen((v) => !v)}
                      className="inline-flex items-center gap-1 rounded border border-indigo-400/35 bg-indigo-500/15 px-2 py-0.5 text-[11px] font-medium text-indigo-200 hover:bg-indigo-500/25"
                    >
                      <SlidersHorizontal className="h-3 w-3" />
                      <span>
                        {compareTiedSettingsOpen
                          ? 'Close Settings Compare'
                          : `Enter 2 Settings for ${sharedMissionLabel} Holders`}
                      </span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {sharedBestCandidates.map((cand) => {
                      const m = cand.bestMatchingMission;
                      const isCurrentRunner = best.user.id === cand.user.id && best.mission.id === m.mission.id;
                      const extraSameCount = cand.allMatchingMissions.length - 1;

                      return (
                        <div
                          key={cand.user.id}
                          onClick={() => onSelectManualBest(m.mission.id)}
                          className={`cursor-pointer rounded-lg border p-2.5 transition ${
                            isCurrentRunner
                              ? 'border-cyan-400 bg-cyan-500/20 shadow-sm'
                              : 'border-slate-700/80 bg-[#090e16]/90 hover:border-cyan-500/50 hover:bg-slate-900'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-100">
                                {cand.user.name}
                              </span>
                              {extraSameCount > 0 && (
                                <span className="rounded bg-cyan-500/20 px-1.5 py-0.2 font-mono text-[10px] text-cyan-200">
                                  ×{cand.allMatchingMissions.length}
                                </span>
                              )}
                              {isCurrentRunner && (
                                <span className="rounded bg-cyan-400/25 px-1.5 py-0.2 text-[10px] font-bold text-cyan-100">
                                  SELECTED
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-xs tabular-nums text-cyan-200">
                              {getDisplayScoreText(m, mode)}
                            </span>
                          </div>

                          {/* Show attached binds if any */}
                          {(m.mission.setting1 || m.mission.setting2) && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {m.mission.setting1 && (
                                <BindChip
                                  label={m.mission.setting1}
                                  score={m.setting1Score}
                                  kind="S1"
                                />
                              )}
                              {m.mission.setting2 && (
                                <BindChip
                                  label={m.mission.setting2}
                                  score={m.setting2Score}
                                  kind="S2"
                                />
                              )}
                            </div>
                          )}

                          {/* Show what worst mission they'd burn if NOT picked */}
                          <div className="mt-1.5 text-[11px] text-slate-400">
                            If not running: burns{' '}
                            <span className="font-medium text-slate-300">
                              {cand.userWorstOverall.mission.missionName} (
                              {formatScore(cand.userWorstOverall.baseScore)})
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Side-by-side 2-Settings Comparison Editor for the Best / Tied Candidates */}
              {compareTiedSettingsOpen && (
                <div className="mt-3 space-y-2 rounded-lg border border-indigo-500/35 bg-[#080c13] p-3">
                  <div className="text-xs font-semibold text-indigo-200">
                    Attach / Compare Additional 2 Settings (`G1:H5` & `J1:K14`)
                  </div>
                  {(sharedBestCandidates.length > 0
                    ? sharedBestCandidates.flatMap((c) => c.allMatchingMissions)
                    : [best]
                  ).map((sm) => (
                    <div
                      key={sm.mission.id}
                      className="grid grid-cols-1 items-center gap-2 rounded border border-slate-800 bg-slate-900/60 p-2 sm:grid-cols-12"
                    >
                      <div className="sm:col-span-4 flex items-center justify-between sm:justify-start gap-2">
                        <span className="text-xs font-semibold text-slate-100">
                          {sm.user.name}
                        </span>
                        <span className="font-mono text-[11px] text-cyan-300">
                          Σ {formatScore(sm.knownTotal)}
                        </span>
                      </div>
                      <div className="sm:col-span-4">
                        <select
                          value={sm.mission.setting1 || ''}
                          onChange={(e) =>
                            onUpdateMission(sm.mission.id, {
                              setting1: e.target.value || undefined,
                            })
                          }
                          className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 focus:border-indigo-400 focus:outline-none"
                        >
                          <option value="">Setting 1 (G1:H5)...</option>
                          {weights.setting1.map((opt) => (
                            <option key={opt.name} value={opt.name}>
                              {opt.name} ({formatScore(opt.score)})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="sm:col-span-4">
                        <select
                          value={sm.mission.setting2 || ''}
                          onChange={(e) =>
                            onUpdateMission(sm.mission.id, {
                              setting2: e.target.value || undefined,
                            })
                          }
                          className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 focus:border-purple-400 focus:outline-none"
                        >
                          <option value="">Setting 2 (J1:K14)...</option>
                          {weights.setting2.map((opt) => (
                            <option key={opt.name} value={opt.name}>
                              {opt.name} ({formatScore(opt.score)})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SLOTS 2..6: THE 5 "WORST" MISSIONS FOR THE 5 OTHER USERS */}
            <div className="rounded-xl border border-rose-500/25 bg-[#0a0f17] p-3.5">
              <div className="mb-2.5 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-rose-300">
                  <Flame className="h-3.5 w-3.5 text-rose-400" />
                  5x Worst Missions — Burn / Sacrifice (Other 5 Users)
                </span>
                <span className="font-mono text-xs text-slate-400">
                  {plan.burnSlots.filter((s) => s.selectedWorst !== null).length}/5 ready
                </span>
              </div>

              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, slotIdx) => {
                  const slot = plan.burnSlots[slotIdx];
                  if (!slot) {
                    return (
                      <div
                        key={`empty-slot-${slotIdx}`}
                        className="flex items-center justify-between rounded-lg border border-dashed border-slate-800/80 bg-slate-950/40 px-3 py-2 text-xs text-slate-600"
                      >
                        <span>Other User #{slotIdx + 1}</span>
                        <span>Awaiting squad player...</span>
                      </div>
                    );
                  }

                  const w = slot.selectedWorst;
                  return (
                    <div
                      key={slot.user.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800/90 bg-[#0e1520] px-3 py-2"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="w-5 font-mono text-xs text-slate-500">
                          #{slotIdx + 1}
                        </span>
                        <span className="text-xs font-semibold text-slate-100">
                          {slot.user.name}
                        </span>

                        {w ? (
                          <>
                            <MissionTag
                              name={w.mission.missionName}
                              score={w.baseScore}
                              size="sm"
                            />
                            {w.mission.setting1 && (
                              <BindChip
                                label={w.mission.setting1}
                                score={w.setting1Score}
                                kind="S1"
                              />
                            )}
                            {w.mission.setting2 && (
                              <BindChip
                                label={w.mission.setting2}
                                score={w.setting2Score}
                                kind="S2"
                              />
                            )}
                          </>
                        ) : (
                          <span className="text-xs italic text-amber-400/80">
                            No missions entered for {slot.user.name}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {slot.allUserMissionsSortedWorstFirst.length > 1 && w && (
                          <select
                            value={w.mission.id}
                            onChange={(e) =>
                              onSelectManualBurn(
                                slot.user.id,
                                e.target.value ===
                                  slot.allUserMissionsSortedWorstFirst[0].mission.id
                                  ? null
                                  : e.target.value
                              )
                            }
                            title={`Choose which mission ${slot.user.name} sacrifices (defaults to worst)`}
                            className="rounded border border-slate-700/80 bg-slate-900 px-1.5 py-0.5 text-[11px] text-slate-300 focus:border-rose-400 focus:outline-none"
                          >
                            {slot.allUserMissionsSortedWorstFirst.map((cand, idx) => (
                              <option key={cand.mission.id} value={cand.mission.id}>
                                {idx === 0 ? 'Worst: ' : 'Alt: '}
                                {cand.mission.missionName} (
                                {getDisplayScoreText(cand, mode)})
                              </option>
                            ))}
                          </select>
                        )}

                        {w && (
                          <span className="font-mono text-xs tabular-nums text-rose-300">
                            {getDisplayScoreText(w, mode)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons: Copy Summary & Complete Run */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/90 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-emerald-300">Copied Squad Plan!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-slate-400" />
                    <span>Copy Squad Plan for Chat</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onCompleteCurrentRun}
                className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-cyan-500 active:scale-[0.99]"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>
                  Complete Run #{completedRuns.length + 1} (Consume {totalSelectedCount} Selected)
                </span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* ALL MISSIONS RANKED & GROUPED BY TYPE (SHOWING ALL USERS WHO HAVE EACH MISSION) */}
      <div className="rounded-xl border border-slate-800/90 bg-[#0d131d] p-4 shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">
              All Ranked Missions & Users Holding Each Type
            </h3>
            <p className="text-xs text-slate-400">
              Shows every user who holds each mission rank. Click any user chip to set them as the 1 Best runner.
            </p>
          </div>
        </div>

        <div className="space-y-2.5">
          {plan.missionGroups.map((group, idx) => {
            const userCount = group.usersWithMission.length;
            const totalBells = group.entries.length;

            return (
              <div
                key={group.missionName}
                className="rounded-lg border border-slate-800/90 bg-[#090e16] p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-500">
                      #{idx + 1}
                    </span>
                    <MissionTag
                      name={group.missionName}
                      score={group.missionScore}
                      size="md"
                    />
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      userCount > 1
                        ? 'bg-cyan-500/15 text-cyan-200 border border-cyan-500/30'
                        : userCount === 1
                        ? 'bg-slate-800 text-slate-300'
                        : 'text-slate-600'
                    }`}
                  >
                    {userCount === 0
                      ? '0 users'
                      : userCount === 1
                      ? `1 user (${totalBells} mission${totalBells > 1 ? 's' : ''})`
                      : `${userCount} users have ${group.missionName} (${totalBells} total)`}
                  </span>
                </div>

                {userCount > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {group.usersWithMission.map((cand) => {
                      const sm = cand.bestMatchingMission;
                      const isSelectedBest =
                        plan.bestSelection?.mission.id === sm.mission.id;
                      const countForUser = cand.allMatchingMissions.length;

                      return (
                        <button
                          key={cand.user.id}
                          type="button"
                          onClick={() => onSelectManualBest(sm.mission.id)}
                          title={`Click to pick ${cand.user.name}'s ${group.missionName} as the 1 Best mission to run`}
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition ${
                            isSelectedBest
                              ? 'border-cyan-400 bg-cyan-500/20 text-cyan-100 font-semibold'
                              : 'border-slate-700/80 bg-slate-900/90 text-slate-200 hover:border-cyan-500/40 hover:text-cyan-100'
                          }`}
                        >
                          {isSelectedBest && (
                            <Star className="h-3 w-3 fill-cyan-300 text-cyan-300" />
                          )}
                          <span>{cand.user.name}</span>
                          {countForUser > 1 && (
                            <span className="rounded bg-slate-800 px-1 font-mono text-[10px] text-cyan-300">
                              ×{countForUser}
                            </span>
                          )}
                          {sm.bindsCount > 0 && (
                            <span className="rounded bg-indigo-500/20 px-1 font-mono text-[10px] text-indigo-200">
                              Σ {formatScore(sm.knownTotal)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Completed Runs Log */}
      {completedRuns.length > 0 && (
        <div className="rounded-xl border border-slate-800/90 bg-[#0d131d] p-4 shadow-lg">
          <div className="mb-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-cyan-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Completed Runs ({completedRuns.length})
              </h3>
            </div>
          </div>

          <div className="space-y-2">
            {completedRuns.map((run) => (
              <div
                key={run.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-[#090e16] px-3 py-2 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-cyan-500/15 px-1.5 py-0.5 font-mono text-[11px] font-bold text-cyan-300">
                      Run #{run.runNumber}
                    </span>
                    <span className="font-semibold text-slate-100">
                      ★ {run.best.userName}: {run.best.missionName} ({run.best.scoreDisplay})
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Burned:{' '}
                    {run.burns
                      .map((b) => `${b.userName} (${b.missionName})`)
                      .join(', ') || 'None'}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onUndoRun(run.id)}
                  className="inline-flex items-center gap-1 rounded border border-slate-700 bg-slate-800/80 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-700"
                >
                  <Undo2 className="h-3 w-3" />
                  <span>Undo Run</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
