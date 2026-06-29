import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "react-router-dom";

import {
  GmailReconnectModal,
  type GmailReconnectModalMode,
} from "@/features/admin/components/GmailReconnectModal";
import { useGmailMailIntegrationStatus } from "@/features/admin/hooks/useGmailMailIntegration";
import { isGmailNeedsReconnectError } from "@/features/admin/lib/gmailReconnect";

const CONNECT_PROMPT_SESSION_KEY = "admin-gmail-connect-modal-shown";

type GmailReconnectContextValue = {
  openGmailReconnectModal: (mode?: GmailReconnectModalMode) => void;
  /** Returns true when the error was handled (modal opened). */
  handleGmailError: (err: unknown) => boolean;
};

const GmailReconnectContext = createContext<GmailReconnectContextValue | null>(
  null,
);

export function GmailReconnectProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<GmailReconnectModalMode>("reconnect");
  const gmailStatus = useGmailMailIntegrationStatus();

  const openGmailReconnectModal = useCallback(
    (nextMode: GmailReconnectModalMode = "reconnect") => {
      setMode(nextMode);
      setOpen(true);
    },
    [],
  );

  const handleGmailError = useCallback(
    (err: unknown): boolean => {
      if (!isGmailNeedsReconnectError(err)) return false;
      openGmailReconnectModal("reconnect");
      return true;
    },
    [openGmailReconnectModal],
  );

  useEffect(() => {
    if (!gmailStatus.isSuccess || !gmailStatus.data) return;

    if (gmailStatus.data.needsReconnect) {
      openGmailReconnectModal("reconnect");
      return;
    }

    if (gmailStatus.data.connected) return;
    if (location.pathname === "/settings") return;
    if (sessionStorage.getItem(CONNECT_PROMPT_SESSION_KEY)) return;

    sessionStorage.setItem(CONNECT_PROMPT_SESSION_KEY, "1");
    openGmailReconnectModal("connect");
  }, [
    gmailStatus.isSuccess,
    gmailStatus.data?.connected,
    gmailStatus.data?.needsReconnect,
    location.pathname,
    openGmailReconnectModal,
  ]);

  const value = useMemo(
    () => ({ openGmailReconnectModal, handleGmailError }),
    [openGmailReconnectModal, handleGmailError],
  );

  return (
    <GmailReconnectContext.Provider value={value}>
      {children}
      <GmailReconnectModal open={open} onOpenChange={setOpen} mode={mode} />
    </GmailReconnectContext.Provider>
  );
}

export function useGmailReconnectPrompt(): GmailReconnectContextValue {
  const ctx = useContext(GmailReconnectContext);
  if (!ctx) {
    throw new Error(
      "useGmailReconnectPrompt must be used within GmailReconnectProvider",
    );
  }
  return ctx;
}

/** Safe outside provider — returns null instead of throwing. */
export function useGmailReconnectPromptOptional(): GmailReconnectContextValue | null {
  return useContext(GmailReconnectContext);
}
