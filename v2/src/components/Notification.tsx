import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Check, Info, X } from "lucide-react";

type Props = {
  toast: { message: string; kind: "success" | "error" } | null;
  modalKind?: string;
  onDismiss: () => void;
};

export function Notification({ toast, modalKind, onDismiss }: Props) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => {
    // Native dialogs occupy the top layer, so their feedback belongs inside them.
    setHost(
      modalKind
        ? document.querySelector<HTMLDialogElement>("dialog[open]")
        : null,
    );
  }, [modalKind, toast?.message]);

  const content = (
    <div className="toast-region" aria-live="polite" aria-atomic="true">
      <AnimatePresence>
        {toast && (
          <motion.div
            className={`toast ${toast.kind}`}
            initial={{ opacity: 0, y: 15, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
            key={toast.message}
          >
            {toast.kind === "success" ? (
              <Check size={17} />
            ) : (
              <Info size={17} />
            )}
            <span>{toast.message}</span>
            <button aria-label="Dismiss notification" onClick={onDismiss}>
              <X size={15} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
  return modalKind && host ? createPortal(content, host) : content;
}
