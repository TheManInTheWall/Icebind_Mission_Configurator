import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Database,
  Download,
  RefreshCw,
  Shield,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { MissionEntryPanel } from './components/MissionEntryPanel';
import { SheetModal } from './components/SheetModal';
import { SquadRankerPanel } from './components/SquadRankerPanel';
import {
  DEFAULT_SHEET_URL,
  DEFAULT_WEIGHTS,
  SheetWeights,
  fetchGoogleSheetWeights,
} from './data/sheetData';
import { downloadStandaloneHtml } from './utils/exportHtml';
import {
  CompletedRunRecord,
  ScoringMode,
  SquadUser,
  UserMission,
  computeSquadPlan,
  createSampleSquadData,
  getDisplayScoreText,
} from './utils/ranking';

const STORAGE_KEY = 'icebind_squad_ranker_state_v1';

interface PersistedState {
  users: SquadUser[];
  missions: UserMission[];
  completedRuns: CompletedRunRecord[];
  sheetUrl: string;
  weights: SheetWeights;
  mode: ScoringMode;
}

function loadInitialState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedState>;
      if (Array.isArray(parsed.users) && Array.isArray(parsed.missions)) {
        return {
          users: parsed.users,
          missions: parsed.missions,
          completedRuns: Array.isArray(parsed.completedRuns)
            ? parsed.completedRuns
            : [],
          sheetUrl: parsed.sheetUrl || DEFAULT_SHEET_URL,
          weights: parsed.weights || DEFAULT_WEIGHTS,
          mode: parsed.mode === 'combined' ? 'combined' : 'mission-first',
        };
      }
    }
  } catch {
    // Ignore storage parse error
  }

  return {
    users: [],
    missions: [],
    completedRuns: [],
    sheetUrl: DEFAULT_SHEET_URL,
    weights: DEFAULT_WEIGHTS,
    mode: 'mission-first',
  };
}

export function App() {
  const initial = useMemo(() => loadInitialState(), []);

  const [users, setUsers] = useState<SquadUser[]>(initial.users);
  const [missions, setMissions] = useState<UserMission[]>(initial.missions);
  const [completedRuns, setCompletedRuns] = useState<CompletedRunRecord[]>(
    initial.completedRuns
  );
  const [sheetUrl, setSheetUrl] = useState<string>(initial.sheetUrl);
  const [weights, setWeights] = useState<SheetWeights>(initial.weights);
  const [mode, setMode] = useState<ScoringMode>(initial.mode);

  const [manualBestMissionId, setManualBestMissionId] = useState<string | null>(
    null
  );
  const [manualBurnByUser, setManualBurnByUser] = useState<
    Record<string, string>
  >({});
  const [editingMissionId, setEditingMissionId] = useState<string | null>(null);

  const [sheetModalOpen, setSheetModalOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<
    'idle' | 'syncing' | 'live' | 'fallback'
  >('idle');
  const [syncMessage, setSyncMessage] = useState<string>(
    'Using sheet ranges D1:E4, G1:H5, J1:K14.'
  );
  const [confirmClear, setConfirmClear] = useState(false);

  // Persist to localStorage
  useEffect(() => {
    try {
      const payload: PersistedState = {
        users,
        missions,
        completedRuns,
        sheetUrl,
        weights,
        mode,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore quota errors
    }
  }, [users, missions, completedRuns, sheetUrl, weights, mode]);

  const syncFromGoogleSheet = useCallback(async (targetUrl: string) => {
    setSyncStatus('syncing');
    setSyncMessage('Reading Google Sheet ranges D1:E4, G1:H5, J1:K14...');
    try {
      const result = await fetchGoogleSheetWeights(targetUrl);
      setWeights(result.weights);
      setSyncStatus('live');
      setSyncMessage(
        `Live synced from Google Sheet (${result.weights.missions.length} missions, ${result.weights.setting1.length} setting 1, ${result.weights.setting2.length} setting 2 via ${result.method}).`
      );
    } catch {
      setSyncStatus('fallback');
      setSyncMessage(
        'Using built-in D1:E4, G1:H5, J1:K14 sheet values. (Set Google Sheet sharing to "Anyone with the link -> Viewer" for live auto-updates, or paste cells directly.)'
      );
    }
  }, []);

  // Attempt live read from the provided Google Sheet on startup
  useEffect(() => {
    syncFromGoogleSheet(sheetUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Compute current 1 Best + 5 Worst plan
  const plan = useMemo(
    () =>
      computeSquadPlan({
        users,
        missions,
        weights,
        mode,
        manualBestMissionId,
        manualBurnByUser,
      }),
    [users, missions, weights, mode, manualBestMissionId, manualBurnByUser]
  );

  const makeId = (prefix: string) =>
    `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const handleAddUserOnly = (userName: string) => {
    const cleanName = userName.trim();
    if (!cleanName) return;
    const exists = users.some(
      (u) => u.name.toLowerCase() === cleanName.toLowerCase()
    );
    if (exists) return;
    const activeSquadCount = users.filter((u) => u.inSquad).length;
    const newUser: SquadUser = {
      id: makeId('u'),
      name: cleanName,
      inSquad: activeSquadCount < 6,
    };
    setUsers((prev) => [...prev, newUser]);
  };

  const handleAddMissionForUserName = (
    userName: string,
    missionName: string,
    setting1?: string,
    setting2?: string
  ) => {
    const cleanName = userName.trim();
    if (!cleanName) return;

    let targetUser = users.find(
      (u) => u.name.toLowerCase() === cleanName.toLowerCase()
    );

    if (!targetUser) {
      const activeSquadCount = users.filter((u) => u.inSquad).length;
      targetUser = {
        id: makeId('u'),
        name: cleanName,
        inSquad: activeSquadCount < 6,
      };
      setUsers((prev) => [...prev, targetUser!]);
    }

    const newMission: UserMission = {
      id: makeId('m'),
      userId: targetUser.id,
      missionName,
      setting1: setting1 || undefined,
      setting2: setting2 || undefined,
      createdAt: Date.now(),
    };
    setMissions((prev) => [...prev, newMission]);
  };

  const handleAddMissionForUserId = (
    userId: string,
    missionName: string,
    setting1?: string,
    setting2?: string
  ) => {
    const newMission: UserMission = {
      id: makeId('m'),
      userId,
      missionName,
      setting1: setting1 || undefined,
      setting2: setting2 || undefined,
      createdAt: Date.now(),
    };
    setMissions((prev) => [...prev, newMission]);
  };

  const handleUpdateMission = (
    missionId: string,
    patch: Partial<Pick<UserMission, 'missionName' | 'setting1' | 'setting2'>>
  ) => {
    setMissions((prev) =>
      prev.map((m) => (m.id === missionId ? { ...m, ...patch } : m))
    );
  };

  const handleDeleteMission = (missionId: string) => {
    setMissions((prev) => prev.filter((m) => m.id !== missionId));
    if (manualBestMissionId === missionId) {
      setManualBestMissionId(null);
    }
    if (editingMissionId === missionId) {
      setEditingMissionId(null);
    }
  };

  const handleRestoreMission = (missionId: string) => {
    setMissions((prev) =>
      prev.map((m) =>
        m.id === missionId ? { ...m, consumedRunNumber: undefined } : m
      )
    );
  };

  const handleToggleUserInSquad = (userId: string) => {
    setUsers((prev) => {
      const target = prev.find((u) => u.id === userId);
      if (!target) return prev;
      if (!target.inSquad) {
        const currentActive = prev.filter((u) => u.inSquad).length;
        if (currentActive >= 6) {
          // Swap: bench the last active user without missions (or 6th active) so squad stays <= 6
          const activeList = prev.filter((u) => u.inSquad);
          const victim = activeList[activeList.length - 1];
          return prev.map((u) => {
            if (u.id === userId) return { ...u, inSquad: true };
            if (victim && u.id === victim.id) return { ...u, inSquad: false };
            return u;
          });
        }
      }
      return prev.map((u) =>
        u.id === userId ? { ...u, inSquad: !u.inSquad } : u
      );
    });
  };

  const handleRenameUser = (userId: string, newName: string) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, name: newName } : u))
    );
  };

  const handleDeleteUser = (userId: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    setMissions((prev) => prev.filter((m) => m.userId !== userId));
  };

  const handleCreateSixDefaultUsers = () => {
    setUsers((prev) => {
      const next = [...prev];
      let activeCount = next.filter((u) => u.inSquad).length;
      let idx = 1;
      while (next.length < 6) {
        const candidateName = `User ${idx}`;
        if (
          !next.some(
            (u) => u.name.toLowerCase() === candidateName.toLowerCase()
          )
        ) {
          next.push({
            id: makeId(`u${idx}`),
            name: candidateName,
            inSquad: activeCount < 6,
          });
          activeCount++;
        }
        idx++;
      }
      return next;
    });
  };

  const handleLoadSampleSquad = () => {
    const sample = createSampleSquadData();
    setUsers(sample.users);
    setMissions(sample.missions);
    setCompletedRuns([]);
    setManualBestMissionId(null);
    setManualBurnByUser({});
    setEditingMissionId(null);
    setConfirmClear(false);
  };

  const handleClearAll = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      window.setTimeout(() => setConfirmClear(false), 3500);
      return;
    }
    setUsers([]);
    setMissions([]);
    setCompletedRuns([]);
    setManualBestMissionId(null);
    setManualBurnByUser({});
    setEditingMissionId(null);
    setConfirmClear(false);
  };

  const handleSelectManualBurn = (userId: string, missionId: string | null) => {
    setManualBurnByUser((prev) => {
      const next = { ...prev };
      if (!missionId) {
        delete next[userId];
      } else {
        next[userId] = missionId;
      }
      return next;
    });
  };

  const handleCompleteCurrentRun = () => {
    if (!plan.bestSelection) return;
    const nextRunNum =
      completedRuns.length > 0
        ? Math.max(...completedRuns.map((r) => r.runNumber)) + 1
        : 1;

    const best = plan.bestSelection;
    const chosenBurns = plan.burnSlots
      .map((s) => s.selectedWorst)
      .filter((sm): sm is NonNullable<typeof sm> => sm !== null);

    const consumedIds = new Set<string>([
      best.mission.id,
      ...chosenBurns.map((b) => b.mission.id),
    ]);

    const record: CompletedRunRecord = {
      id: makeId('run'),
      runNumber: nextRunNum,
      completedAt: Date.now(),
      best: {
        userId: best.user.id,
        userName: best.user.name,
        missionId: best.mission.id,
        missionName: best.mission.missionName,
        setting1: best.mission.setting1,
        setting2: best.mission.setting2,
        scoreDisplay: getDisplayScoreText(best, mode),
      },
      burns: chosenBurns.map((b) => ({
        userId: b.user.id,
        userName: b.user.name,
        missionId: b.mission.id,
        missionName: b.mission.missionName,
        setting1: b.mission.setting1,
        setting2: b.mission.setting2,
        scoreDisplay: getDisplayScoreText(b, mode),
      })),
    };

    setMissions((prev) =>
      prev.map((m) =>
        consumedIds.has(m.id) ? { ...m, consumedRunNumber: nextRunNum } : m
      )
    );
    setCompletedRuns((prev) => [record, ...prev]);
    setManualBestMissionId(null);
    setManualBurnByUser({});
  };

  const handleUndoRun = (runId: string) => {
    const target = completedRuns.find((r) => r.id === runId);
    if (!target) return;
    const idsToRestore = new Set<string>([
      target.best.missionId,
      ...target.burns.map((b) => b.missionId),
    ]);
    setMissions((prev) =>
      prev.map((m) =>
        idsToRestore.has(m.id) ? { ...m, consumedRunNumber: undefined } : m
      )
    );
    setCompletedRuns((prev) => prev.filter((r) => r.id !== runId));
  };

  return (
    <div className="min-h-screen bg-[#080c12] text-slate-100">
      {/* Top Tactical Command Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-800/90 bg-[#0a0f18]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-500/35 bg-cyan-500/15 text-cyan-300">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white sm:text-base">
                Icebind Squad Mission Ranker
              </h1>
              <p className="text-[11px] text-slate-400">
                1 Best Mission (Vote/Run) + 5 Worst Missions (Burn) • Sheet{' '}
                <code className="text-cyan-300/90">D1:E4</code> /{' '}
                <code className="text-indigo-300/90">G1:H5</code> /{' '}
                <code className="text-purple-300/90">J1:K14</code>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Google Sheet Weights & Sync Button */}
            <button
              type="button"
              onClick={() => setSheetModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/90 bg-slate-900/90 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-cyan-500/40 hover:bg-slate-800"
              title={syncMessage}
            >
              {syncStatus === 'syncing' ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-cyan-400" />
              ) : syncStatus === 'live' ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Database className="h-3.5 w-3.5 text-cyan-400" />
              )}
              <span>
                {syncStatus === 'live' ? 'Sheet: Live' : 'Sheet Weights'}
              </span>
            </button>

            {/* Load Sample 6-Player Squad */}
            <button
              type="button"
              onClick={handleLoadSampleSquad}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/90 bg-slate-900/90 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-cyan-500/40 hover:bg-slate-800"
              title="Populate a 6-player sample squad with multiple Disruption holders"
            >
              <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
              <span>Sample 6-Squad</span>
            </button>

            {/* Clear Roster */}
            {(users.length > 0 || missions.length > 0) && (
              <button
                type="button"
                onClick={handleClearAll}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  confirmClear
                    ? 'border-rose-500 bg-rose-600 text-white'
                    : 'border-slate-700/90 bg-slate-900/90 text-slate-300 hover:border-rose-500/40 hover:text-rose-200'
                }`}
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{confirmClear ? 'Confirm Clear?' : 'Clear All'}</span>
              </button>
            )}

            {/* Download Standalone HTML for GitHub */}
            <button
              type="button"
              onClick={() => downloadStandaloneHtml('index.html')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/25"
              title="Download standalone single-file index.html ready to upload to GitHub / GitHub Pages"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download HTML (GitHub)</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main 2-Column Workspace */}
      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-5 px-4 py-5 sm:px-6 lg:grid-cols-12">
        {/* Left Column: Enter Missions Attached to Users */}
        <section className="lg:col-span-5">
          <MissionEntryPanel
            users={users}
            missions={missions}
            weights={weights}
            mode={mode}
            plan={plan}
            editingMissionId={editingMissionId}
            onSetEditingMissionId={setEditingMissionId}
            onAddUserOnly={handleAddUserOnly}
            onAddMissionForUserName={handleAddMissionForUserName}
            onAddMissionForUserId={handleAddMissionForUserId}
            onUpdateMission={handleUpdateMission}
            onDeleteMission={handleDeleteMission}
            onRestoreMission={handleRestoreMission}
            onToggleUserInSquad={handleToggleUserInSquad}
            onRenameUser={handleRenameUser}
            onDeleteUser={handleDeleteUser}
            onCreateSixDefaultUsers={handleCreateSixDefaultUsers}
            onLoadSampleSquad={handleLoadSampleSquad}
            onSelectManualBest={(id) => setManualBestMissionId(id)}
          />
        </section>

        {/* Right Column: Squad Ranker & 1 Best + 5 Worst Selector */}
        <section className="lg:col-span-7">
          <SquadRankerPanel
            plan={plan}
            weights={weights}
            mode={mode}
            onChangeMode={setMode}
            onSelectManualBest={setManualBestMissionId}
            onSelectManualBurn={handleSelectManualBurn}
            onUpdateMission={handleUpdateMission}
            onCompleteCurrentRun={handleCompleteCurrentRun}
            completedRuns={completedRuns}
            onUndoRun={handleUndoRun}
          />
        </section>
      </main>

      {/* Google Sheet Inspection / Sync / Edit Modal */}
      <SheetModal
        open={sheetModalOpen}
        onClose={() => setSheetModalOpen(false)}
        sheetUrl={sheetUrl}
        onChangeSheetUrl={setSheetUrl}
        weights={weights}
        onUpdateWeights={(nextWeights, label) => {
          setWeights(nextWeights);
          setSyncMessage(`Weights updated (${label}).`);
        }}
        syncStatus={syncStatus}
        syncMessage={syncMessage}
        onTriggerSync={() => syncFromGoogleSheet(sheetUrl)}
      />
    </div>
  );
}

export default App;
