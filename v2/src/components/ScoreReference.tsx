import { motion } from "motion/react";
import { ExternalLink, FileSpreadsheet, Info, RefreshCw } from "lucide-react";
import { SHEET_URL, formatScore } from "../lib/planner";
import type { ScoreEntry, Scores } from "../lib/planner";

export function ScoreReference({
  scores,
  lastSynced,
  syncing,
  error,
  onSync,
  onReset,
}: {
  scores: Scores;
  lastSynced: string | null;
  syncing: boolean;
  error: string;
  onSync: () => void;
  onReset: () => void;
}) {
  const sections: { title: string; range: string; entries: ScoreEntry[] }[] = [
    { title: "Mission types", range: "D1:E4", entries: scores.missions },
    { title: "Additional setting 1", range: "G1:H5", entries: scores.setting1 },
    {
      title: "Additional setting 2",
      range: "J1:K14",
      entries: scores.setting2,
    },
  ];
  return (
    <motion.section
      className="reference-page"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="section-heading">
        <div>
          <div className="eyebrow">THE NUMBERS BEHIND THE PLAN</div>
          <h2>Score reference</h2>
          <p>One source of truth. Every mission and setting, at a glance.</p>
        </div>
        <button
          className="button button-primary"
          onClick={onSync}
          disabled={syncing}
        >
          <RefreshCw size={16} className={syncing ? "spin" : ""} />
          {syncing ? "Reading spreadsheet..." : "Refresh from Sheets"}
        </button>
      </div>
      <div className="reference-source">
        <FileSpreadsheet size={18} />
        <div>
          <strong>
            {lastSynced
              ? "Scores refreshed from Google Sheets"
              : "Using the scores you provided"}
          </strong>
          <span>
            {lastSynced
              ? `Last refreshed ${new Date(lastSynced).toLocaleString()}`
              : "The original reference is saved locally, so planning works offline."}
          </span>
        </div>
        <a
          className="text-button"
          href={SHEET_URL}
          target="_blank"
          rel="noreferrer"
        >
          Open spreadsheet
          <ExternalLink size={14} />
        </a>
      </div>
      {error && (
        <div className="sync-error" role="alert">
          <Info size={19} />
          <div>
            <strong>Couldn't refresh the spreadsheet</strong>
            <p>
              {error} In Google Sheets, set Share to "Anyone with the link" and
              Viewer, then try again. Your existing scores are unchanged.
            </p>
          </div>
        </div>
      )}
      <div className="reference-grid">
        {sections.map((section) => (
          <section className="reference-section" key={section.title}>
            <div className="reference-title">
              <h3>{section.title}</h3>
              <code>{section.range}</code>
            </div>
            <div className="reference-table-heading">
              <span>NAME</span>
              <span>SCORE</span>
            </div>
            {section.entries.map((entry) => (
              <div className="reference-row" key={entry.name}>
                <span>{entry.name}</span>
                <strong>{formatScore(entry.score)}</strong>
              </div>
            ))}
          </section>
        ))}
      </div>
      <div className="reference-bottom">
        <p>
          <Info size={15} />
          Additional settings are optional. Combined score = base + setting 1 +
          setting 2.
        </p>
        <button className="text-button" onClick={onReset}>
          Restore provided scores
          <RefreshCw size={13} />
        </button>
      </div>
    </motion.section>
  );
}
