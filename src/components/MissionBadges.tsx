import React from 'react';
import { BIND_NOTES } from '../data/sheetData';
import { formatScore } from '../utils/ranking';

export function getMissionStyle(missionName: string): {
  bg: string;
  border: string;
  text: string;
  dot: string;
  buttonBg: string;
} {
  const key = missionName.trim().toLowerCase();
  if (key.includes('disruption')) {
    return {
      bg: 'bg-cyan-500/12',
      border: 'border-cyan-400/35',
      text: 'text-cyan-200',
      dot: 'bg-cyan-400',
      buttonBg:
        'bg-cyan-500/12 hover:bg-cyan-500/22 border-cyan-400/35 text-cyan-100',
    };
  }
  if (key.includes('survival')) {
    return {
      bg: 'bg-sky-500/12',
      border: 'border-sky-400/30',
      text: 'text-sky-200',
      dot: 'bg-sky-400',
      buttonBg:
        'bg-sky-500/12 hover:bg-sky-500/22 border-sky-400/30 text-sky-100',
    };
  }
  if (key.includes('excavation')) {
    return {
      bg: 'bg-amber-500/12',
      border: 'border-amber-400/30',
      text: 'text-amber-200',
      dot: 'bg-amber-400',
      buttonBg:
        'bg-amber-500/12 hover:bg-amber-500/22 border-amber-400/30 text-amber-100',
    };
  }
  if (key.includes('mobile') || key.includes('defen')) {
    return {
      bg: 'bg-rose-500/12',
      border: 'border-rose-400/30',
      text: 'text-rose-200',
      dot: 'bg-rose-400',
      buttonBg:
        'bg-rose-500/12 hover:bg-rose-500/22 border-rose-400/30 text-rose-100',
    };
  }
  return {
    bg: 'bg-slate-700/30',
    border: 'border-slate-600/50',
    text: 'text-slate-200',
    dot: 'bg-slate-400',
    buttonBg:
      'bg-slate-800 hover:bg-slate-700 border-slate-600/60 text-slate-200',
  };
}

export const MissionTag: React.FC<{
  name: string;
  score?: number;
  size?: 'sm' | 'md' | 'lg';
}> = ({ name, score, size = 'md' }) => {
  const st = getMissionStyle(name);
  const pad =
    size === 'lg'
      ? 'px-3 py-1 text-sm font-semibold'
      : size === 'sm'
      ? 'px-2 py-0.5 text-xs font-medium'
      : 'px-2.5 py-0.5 text-xs font-semibold';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border ${st.bg} ${st.border} ${st.text} ${pad}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
      <span>{name}</span>
      {score !== undefined && (
        <span className="ml-0.5 rounded bg-black/30 px-1.5 py-0.2 font-mono text-[11px] tabular-nums opacity-90">
          {formatScore(score)}
        </span>
      )}
    </span>
  );
};

export const BindChip: React.FC<{
  label: string;
  score?: number | null;
  kind: 'S1' | 'S2';
}> = ({ label, score, kind }) => {
  const note = BIND_NOTES[label];
  return (
    <span
      title={note ? `${label}: ${note}` : label}
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] leading-tight ${
        kind === 'S1'
          ? 'border-indigo-400/25 bg-indigo-500/10 text-indigo-200'
          : 'border-purple-400/25 bg-purple-500/10 text-purple-200'
      }`}
    >
      <span className="truncate max-w-[155px]">{label}</span>
      {score !== null && score !== undefined && (
        <span className="font-mono text-[10px] tabular-nums opacity-80">
          {formatScore(score)}
        </span>
      )}
    </span>
  );
};
