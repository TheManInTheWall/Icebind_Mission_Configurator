import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { motion } from "motion/react";
import { Crosshair, Gem, Radio, Shield, X } from "lucide-react";
import { initials } from "../lib/planner";
import type { Player } from "../lib/planner";

const colors = ["violet", "blue", "rose", "mint", "amber", "peach"];

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`brand ${compact ? "brand-compact" : ""}`}>
      <svg
        className="brand-symbol"
        viewBox="0 0 36 36"
        fill="none"
        aria-hidden="true"
      >
        <path d="M3 7h7l8 15 8-15h7L18 34 3 7Z" fill="currentColor" />
        <path d="m13 3 5 9 5-9H13Z" fill="currentColor" opacity=".55" />
      </svg>
      <span>
        VOIDLINE<span className="brand-dot">.</span>
      </span>
    </span>
  );
}

export function Avatar({
  player,
  small = false,
}: {
  player: Player;
  small?: boolean;
}) {
  return (
    <span
      className={`avatar ${colors[((player.color % 6) + 6) % 6]} ${small ? "avatar-small" : ""}`}
      aria-hidden="true"
    >
      {initials(player.name)}
    </span>
  );
}

export function MissionIcon({
  type,
  small = false,
}: {
  type: string;
  small?: boolean;
}) {
  const Icon =
    type === "Disruption"
      ? Radio
      : type === "Survival"
        ? Shield
        : type === "Excavation"
          ? Gem
          : Crosshair;
  const tone =
    type === "Disruption"
      ? "violet"
      : type === "Survival"
        ? "mint"
        : type === "Excavation"
          ? "amber"
          : "blue";
  return (
    <span
      className={`mission-icon ${tone} ${small ? "mission-icon-small" : ""}`}
    >
      <Icon size={small ? 17 : 21} strokeWidth={1.6} />
    </span>
  );
}

export function Modal({
  title,
  description,
  children,
  onClose,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = previous;
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = ref.current!.getBoundingClientRect();
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        )
          onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="modal-heading">
          <div>
            <div className="eyebrow modal-eyebrow">
              VOIDLINE / MISSION CONTROL
            </div>
            <h2 id={titleId}>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button
            className="icon-button close-button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </motion.div>
    </dialog>
  );
}

export function downloadFile(filename: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
