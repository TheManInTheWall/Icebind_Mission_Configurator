import React, { useState } from 'react';
import {
  CheckCircle2,
  ClipboardPaste,
  ExternalLink,
  RefreshCw,
  RotateCcw,
  Table2,
  X,
  AlertCircle,
} from 'lucide-react';
import {
  DEFAULT_WEIGHTS,
  SheetWeights,
  WeightedOption,
  parsePastedSheetText,
} from '../data/sheetData';
import { formatScore } from '../utils/ranking';

interface SheetModalProps {
  open: boolean;
  onClose: () => void;
  sheetUrl: string;
  onChangeSheetUrl: (url: string) => void;
  weights: SheetWeights;
  onUpdateWeights: (weights: SheetWeights, sourceLabel: string) => void;
  syncStatus: 'idle' | 'syncing' | 'live' | 'fallback';
  syncMessage: string;
  onTriggerSync: () => void;
}

export const SheetModal: React.FC<SheetModalProps> = ({
  open,
  onClose,
  sheetUrl,
  onChangeSheetUrl,
  weights,
  onUpdateWeights,
  syncStatus,
  syncMessage,
  onTriggerSync,
}) => {
  const [pasteBoxOpen, setPasteBoxOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteFeedback, setPasteFeedback] = useState<string | null>(null);

  if (!open) return null;

  const handleScoreEdit = (
    group: keyof SheetWeights,
    index: number,
    rawVal: string
  ) => {
    const num = Number(rawVal.replace(',', '.'));
    if (!Number.isFinite(num)) return;
    const nextGroup: WeightedOption[] = weights[group].map((item, idx) =>
      idx === index ? { ...item, score: Math.round(num * 1000) / 1000 } : item
    );
    onUpdateWeights({ ...weights, [group]: nextGroup }, 'Custom Edited');
  };

  const handleApplyPaste = () => {
    const parsed = parsePastedSheetText(pasteText);
    if (!parsed) {
      setPasteFeedback(
        'Could not detect D1:E4, G1:H5, J1:K14 columns. Select A1:K14 (or D1:K14) in Google Sheets, copy, and paste here.'
      );
      return;
    }
    onUpdateWeights(parsed, 'Pasted from Sheet');
    setPasteFeedback(
      `Imported ${parsed.missions.length} missions, ${parsed.setting1.length} setting 1 options, and ${parsed.setting2.length} setting 2 options.`
    );
    setPasteText('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-slate-800 bg-[#0c121b] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <Table2 className="h-5 w-5 text-cyan-400" />
            <div>
              <h2 className="text-sm font-semibold text-slate-100">
                Google Sheet Weights (`D1:E4`, `G1:H5`, `J1:K14`)
              </h2>
              <p className="text-xs text-slate-400">
                Higher score = better to run (vote). Lower score = worse (better to burn).
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {/* Google Sheet Sync Bar */}
          <div className="rounded-lg border border-slate-800 bg-[#090e16] p-3.5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-300">
                Spreadsheet Source URL (`gid=730193451`)
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={sheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300"
                >
                  <span>Open Sheet</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
                <button
                  onClick={() => setPasteBoxOpen((v) => !v)}
                  className="inline-flex items-center gap-1 rounded border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs text-slate-200 hover:bg-slate-700"
                >
                  <ClipboardPaste className="h-3.5 w-3.5" />
                  <span>{pasteBoxOpen ? 'Hide Paste Import' : 'Paste Cells'}</span>
                </button>
                <button
                  onClick={() => onUpdateWeights(DEFAULT_WEIGHTS, 'Sheet Defaults')}
                  className="inline-flex items-center gap-1 rounded border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-700"
                  title="Restore exact D1:E4, G1:H5, J1:K14 values"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset Defaults</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={sheetUrl}
                onChange={(e) => onChangeSheetUrl(e.target.value)}
                className="flex-1 rounded-lg border border-slate-700/80 bg-slate-900/90 px-3 py-1.5 font-mono text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                placeholder="https://docs.google.com/spreadsheets/d/..."
              />
              <button
                onClick={onTriggerSync}
                disabled={syncStatus === 'syncing'}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-3.5 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/25 disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${
                    syncStatus === 'syncing' ? 'animate-spin' : ''
                  }`}
                />
                <span>{syncStatus === 'syncing' ? 'Reading Sheet...' : 'Read Live Sheet'}</span>
              </button>
            </div>

            <div className="flex items-start gap-2 text-xs">
              {syncStatus === 'live' ? (
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
              )}
              <span className="text-slate-400">{syncMessage}</span>
            </div>

            {pasteBoxOpen && (
              <div className="mt-2 space-y-2 border-t border-slate-800 pt-3">
                <p className="text-xs text-slate-400">
                  If the Google Sheet is private, select <code className="text-cyan-300">A1:K14</code>{' '}
                  (or <code className="text-cyan-300">D1:K14</code>) in Google Sheets, press{' '}
                  <kbd className="rounded bg-slate-800 px-1">Ctrl+C</kbd>, and paste below:
                </p>
                <textarea
                  rows={4}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="Paste cells copied from Google Sheets here..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 font-mono text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-cyan-300">{pasteFeedback}</span>
                  <button
                    onClick={handleApplyPaste}
                    className="rounded-lg bg-cyan-600 px-3 py-1 text-xs font-semibold text-white hover:bg-cyan-500"
                  >
                    Import Pasted Ranges
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 3 Range Tables: D1:E4, G1:H5, J1:K14 */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* D1:E4 */}
            <div className="rounded-lg border border-slate-800 bg-[#090e16] p-3">
              <div className="mb-2 flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-semibold text-cyan-300">
                  D1:E4 — Missions
                </span>
                <span className="font-mono text-[11px] text-slate-500">
                  {weights.missions.length} rows
                </span>
              </div>
              <div className="space-y-1.5">
                {weights.missions.map((item, idx) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between gap-2 rounded bg-slate-900/70 px-2.5 py-1.5 text-xs"
                  >
                    <span className="font-medium text-slate-200">{item.name}</span>
                    <input
                      type="number"
                      step="0.001"
                      defaultValue={formatScore(item.score)}
                      key={`${item.name}-${item.score}`}
                      onBlur={(e) => handleScoreEdit('missions', idx, e.target.value)}
                      className="w-18 rounded border border-slate-700/80 bg-slate-950 px-1.5 py-0.5 text-right font-mono text-xs tabular-nums text-cyan-300 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* G1:H5 */}
            <div className="rounded-lg border border-slate-800 bg-[#090e16] p-3">
              <div className="mb-2 flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-semibold text-indigo-300">
                  G1:H5 — Setting 1 (Mission Bind)
                </span>
                <span className="font-mono text-[11px] text-slate-500">
                  {weights.setting1.length} rows
                </span>
              </div>
              <div className="space-y-1.5">
                {weights.setting1.map((item, idx) => (
                  <div
                    key={item.name}
                    title={item.note}
                    className="flex items-center justify-between gap-2 rounded bg-slate-900/70 px-2.5 py-1.5 text-xs"
                  >
                    <span className="truncate text-slate-200">{item.name}</span>
                    <input
                      type="number"
                      step="0.001"
                      defaultValue={formatScore(item.score)}
                      key={`${item.name}-${item.score}`}
                      onBlur={(e) => handleScoreEdit('setting1', idx, e.target.value)}
                      className="w-18 shrink-0 rounded border border-slate-700/80 bg-slate-950 px-1.5 py-0.5 text-right font-mono text-xs tabular-nums text-indigo-300 focus:border-indigo-400 focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* J1:K14 */}
            <div className="rounded-lg border border-slate-800 bg-[#090e16] p-3">
              <div className="mb-2 flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-semibold text-purple-300">
                  J1:K14 — Setting 2 (Tactical Bind)
                </span>
                <span className="font-mono text-[11px] text-slate-500">
                  {weights.setting2.length} rows
                </span>
              </div>
              <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
                {weights.setting2.map((item, idx) => (
                  <div
                    key={item.name}
                    title={item.note}
                    className="flex items-center justify-between gap-2 rounded bg-slate-900/70 px-2.5 py-1.5 text-xs"
                  >
                    <span className="truncate text-slate-200">{item.name}</span>
                    <input
                      type="number"
                      step="0.001"
                      defaultValue={formatScore(item.score)}
                      key={`${item.name}-${item.score}`}
                      onBlur={(e) => handleScoreEdit('setting2', idx, e.target.value)}
                      className="w-18 shrink-0 rounded border border-slate-700/80 bg-slate-950 px-1.5 py-0.5 text-right font-mono text-xs tabular-nums text-purple-300 focus:border-purple-400 focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-slate-800 px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-800 px-4 py-1.5 text-xs font-semibold text-slate-100 hover:bg-slate-700"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
