import React, { createContext, useContext, useMemo, useState } from "react";

export type AdminOverlayState =
  | null
  | { kind: "create"; consumerId?: string; consumerName?: string }
  | { kind: "notifications" };

type AdminOverlayApi = {
  overlay: AdminOverlayState;
  openCreate: (prefill?: { consumerId?: string; consumerName?: string }) => void;
  openNotifications: () => void;
  close: () => void;
};

const AdminOverlayContext = createContext<AdminOverlayApi | null>(null);

export function AdminOverlayProvider({ children }: { children: React.ReactNode }) {
  const [overlay, setOverlay] = useState<AdminOverlayState>(null);
  const api = useMemo<AdminOverlayApi>(
    () => ({
      overlay,
      openCreate: (prefill) => setOverlay({ kind: "create", ...prefill }),
      openNotifications: () => setOverlay({ kind: "notifications" }),
      close: () => setOverlay(null),
    }),
    [overlay],
  );
  return <AdminOverlayContext.Provider value={api}>{children}</AdminOverlayContext.Provider>;
}

export function useAdminOverlay() {
  return useContext(AdminOverlayContext);
}
