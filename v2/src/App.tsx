import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { motion, MotionConfig } from "motion/react";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCheck,
  CircleHelp,
  Copy,
  Download,
  FileSpreadsheet,
  Info,
  Plus,
  Star,
  Trash2,
  Users,
} from "lucide-react";
const orbitalScene = `${import.meta.env.BASE_URL}images/orbital-scene.jpg`;
import {
  DEFAULT_SCORES,
  SHEET_CSV_URL,
  STORAGE_KEY,
  formatScore,
  loadState,
  rankRuns,
  runText,
  savedTieChoices,
  scoresFromCsv,
  uid,
  validateState,
} from "./lib/planner";
import type { Mission, PlannerState, RankedRun } from "./lib/planner";
import { Avatar, Brand, downloadFile, Modal } from "./components/ui";
import { Help, MissionForm, SquadManager } from "./components/Dialogs";
import { ScoreReference } from "./components/ScoreReference";
import { MissionBoard } from "./components/MissionBoard";
import type { BoardTab } from "./components/MissionBoard";
import { SquadPanel } from "./components/SquadPanel";
import { Notification } from "./components/Notification";
