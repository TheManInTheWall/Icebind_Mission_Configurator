import { ScoringMode, SquadPlan, getDisplayScoreText } from './ranking';

/**
 * Downloads the current single-file bundled application as a clean `index.html`
 * ready to upload directly to GitHub / GitHub Pages.
 */
export function downloadStandaloneHtml(filename = 'index.html'): void {
  const clone = document.documentElement.cloneNode(true) as HTMLElement;

  // Remove any transient JSONP script tags
  clone.querySelectorAll('script[data-temp-jsonp="true"]').forEach((el) => el.remove());

  // Clear rendered React DOM inside #root so the standalone HTML boots fresh
  const rootEl = clone.querySelector('#root');
  if (rootEl) {
    rootEl.innerHTML = '';
  }

  const htmlContent = '<!doctype html>\n' + clone.outerHTML;
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function formatPlanForChat(plan: SquadPlan, mode: ScoringMode): string {
  if (!plan.bestSelection) {
    return 'No missions selected yet.';
  }

  const best = plan.bestSelection;
  const bestBinds = [best.mission.setting1, best.mission.setting2].filter(Boolean).join(' + ');
  const bestLine = `★ RUN (BEST): ${best.user.name} — ${best.mission.missionName}${
    bestBinds ? ` [${bestBinds}]` : ''
  } (${getDisplayScoreText(best, mode)})`;

  const lines: string[] = ['=== ICEBIND SQUAD RUN (1 BEST + 5 WORST) ===', bestLine];

  if (plan.usersWithSelectedMissionType.length > 1) {
    const others = plan.usersWithSelectedMissionType
      .map((c) => c.user.name)
      .join(', ');
    lines.push(`  (All users with ${best.mission.missionName}: ${others})`);
  }

  lines.push('--- BURN / SACRIFICE (5 WORST) ---');
  if (plan.burnSlots.length === 0) {
    lines.push('  (No other squad members yet)');
  } else {
    plan.burnSlots.forEach((slot, idx) => {
      if (!slot.selectedWorst) {
        lines.push(`  ${idx + 1}. ${slot.user.name} — (no missions remaining)`);
      } else {
        const w = slot.selectedWorst;
        const wBinds = [w.mission.setting1, w.mission.setting2].filter(Boolean).join(' + ');
        lines.push(
          `  ${idx + 1}. ${slot.user.name} — ${w.mission.missionName}${
            wBinds ? ` [${wBinds}]` : ''
          } (${getDisplayScoreText(w, mode)})`
        );
      }
    });
  }

  return lines.join('\n');
}
