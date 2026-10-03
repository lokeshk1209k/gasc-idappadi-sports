/**
 * GASC Sports Admin - Offline Status Manager
 * Injects a connection status bar and sync controls into the admin UI.
 * Works in both Electron (via IPC) and browser mode (via HTTP polling).
 */
(function () {
  "use strict";

  const IS_ELECTRON = typeof window !== "undefined" && typeof window.require !== "undefined";
  let ipcRenderer = null;
  if (IS_ELECTRON) {
    try { ipcRenderer = window.require("electron").ipcRenderer; } catch (e) {}
  }

  let isOnline = true;
  let pendingCount = 0;
  let lastSync = null;
  let isSyncing = false;
  let statusBarEl = null;
  let bannerEl = null;
  let pollInterval = null;

  // ─────────────────────────────────────────────
  // Create UI elements
  // ─────────────────────────────────────────────
  function createStatusBar() {
    if (statusBarEl) return;
    statusBarEl = document.createElement("div");
    statusBarEl.id = "gasc-sync-statusbar";
    statusBarEl.style.cssText = `
      position: fixed; top: 0; right: 0; z-index: 99999;
      display: flex; align-items: center; gap: 10px;
      padding: 5px 14px; font-size: 12px; font-weight: 600;
      background: rgba(10,20,35,0.92); backdrop-filter: blur(12px);
      border-bottom-left-radius: 10px; border: 1px solid rgba(255,255,255,0.1);
      color: white; font-family: "Segoe UI", system-ui, sans-serif;
      transition: all 0.3s ease; user-select: none;
    `;
    document.body.appendChild(statusBarEl);
    renderStatusBar();
  }

  function createOfflineBanner() {
    if (bannerEl) return;
    bannerEl = document.createElement("div");
    bannerEl.id = "gasc-offline-banner";
    bannerEl.style.cssText = `
      position: fixed; bottom: 0; left: 0; right: 0; z-index: 99998;
      background: linear-gradient(90deg, rgba(220,80,40,0.95), rgba(180,60,20,0.95));
      color: white; text-align: center; padding: 8px 16px;
      font-size: 13px; font-weight: 600; font-family: "Segoe UI", system-ui, sans-serif;
      backdrop-filter: blur(8px); border-top: 1px solid rgba(255,255,255,0.2);
      display: none; align-items: center; justify-content: center; gap: 10px;
    `;
    bannerEl.innerHTML = `
      <span>⚠️</span>
      <span id="gasc-offline-banner-text">You are currently offline. Changes will be synchronized automatically when the internet connection is restored.</span>
      <span id="gasc-pending-count-text"></span>
    `;
    document.body.appendChild(bannerEl);
  }

  function renderStatusBar() {
    if (!statusBarEl) return;
    let dot, label, syncInfo, syncBtnHtml;
    if (isSyncing) {
      dot = '<span style="color:#60a5fa; font-size:16px;">⟳</span>';
      label = '<span style="color:#60a5fa;">Syncing...</span>';
      syncInfo = "";
      syncBtnHtml = "";
    } else if (isOnline) {
      dot = '<span style="color:#4ade80; font-size:10px;">●</span>';
      label = '<span style="color:#4ade80;">Online</span>';
      const lastSyncStr = lastSync ? `Last sync: ${new Date(lastSync).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}` : "Not synced yet";
      syncInfo = `<span style="color:rgba(255,255,255,0.5); font-size:11px;">${lastSyncStr}</span>`;
      syncBtnHtml = `<button onclick="window.GASC_SYNC && window.GASC_SYNC.manualSync()" style="background:rgba(255,193,7,0.2); border:1px solid rgba(255,193,7,0.4); color:#ffc107; padding:2px 10px; border-radius:20px; cursor:pointer; font-size:11px; font-weight:700;">Sync</button>`;
    } else {
      dot = '<span style="color:#f87171; font-size:10px;">●</span>';
      label = '<span style="color:#f87171;">Offline</span>';
      const pendingStr = pendingCount > 0 ? `<span style="color:#fbbf24;">${pendingCount} pending</span>` : "";
      syncInfo = pendingStr;
      syncBtnHtml = "";
    }
    statusBarEl.innerHTML = `${dot} ${label} ${syncInfo} ${syncBtnHtml}`;
  }

  function updateBanner() {
    if (!bannerEl) return;
    if (!isOnline) {
      bannerEl.style.display = "flex";
      const pendingEl = document.getElementById("gasc-pending-count-text");
      if (pendingEl && pendingCount > 0) pendingEl.textContent = `(${pendingCount} change${pendingCount > 1 ? "s" : ""} pending)`;
    } else {
      bannerEl.style.display = "none";
    }
  }

  // ─────────────────────────────────────────────
  // Update state from data
  // ─────────────────────────────────────────────
  function applyStatus(data) {
    if (!data) return;
    const wasOnline = isOnline;
    isOnline = data.isOnline !== undefined ? data.isOnline : (data.phase === "online" || data.phase === "complete");
    isSyncing = data.phase === "syncing";
    if (data.pendingCount !== undefined) pendingCount = data.pendingCount;
    if (data.lastSync) lastSync = data.lastSync;
    renderStatusBar();
    updateBanner();
    // Show toast on state change
    if (wasOnline && !isOnline) showToast("🔴 Offline — Working with local data", "warning");
    else if (!wasOnline && isOnline) showToast("🟢 Online — Synchronizing...", "success");
    if (data.phase === "complete" && data.uploaded > 0) showToast(`✅ Synced ${data.uploaded} change${data.uploaded > 1 ? "s" : ""} to cloud`, "success");
    if (data.phase === "error") showToast("❌ Sync failed. Will retry.", "error");
  }

  // ─────────────────────────────────────────────
  // Toast notifications
  // ─────────────────────────────────────────────
  function showToast(msg, type = "info") {
    const toast = document.createElement("div");
    toast.style.cssText = `
      position: fixed; bottom: 60px; right: 20px; z-index: 100000;
      padding: 10px 18px; border-radius: 10px; font-size: 13px;
      font-weight: 600; font-family: "Segoe UI", system-ui, sans-serif;
      backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.15);
      box-shadow: 0 8px 30px rgba(0,0,0,0.4); color: white;
      animation: gasc-toast-in 0.3s ease;
      background: ${type === "success" ? "rgba(22,101,52,0.95)" : type === "error" ? "rgba(127,29,29,0.95)" : "rgba(92,67,0,0.95)"};
      max-width: 350px;
    `;
    toast.textContent = msg;
    if (!document.getElementById("gasc-toast-style")) {
      const style = document.createElement("style");
      style.id = "gasc-toast-style";
      style.textContent = "@keyframes gasc-toast-in { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }";
      document.head.appendChild(style);
    }
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = "0"; toast.style.transition = "opacity 0.5s"; setTimeout(() => toast.remove(), 500); }, 3500);
  }

  // ─────────────────────────────────────────────
  // Manual sync trigger
  // ─────────────────────────────────────────────
  async function manualSync() {
    if (isSyncing) return;
    isSyncing = true;
    renderStatusBar();
    showToast("⟳ Syncing with cloud...", "info");
    if (IS_ELECTRON && ipcRenderer) {
      ipcRenderer.invoke("sync:manual");
    } else {
      try {
        const r = await fetch("/api/sync/now", { method: "POST", headers: { "Authorization": "Bearer " + (localStorage.getItem("gasc_token") || "") } });
        const data = await r.json();
        applyStatus({ ...data, phase: data.success ? "complete" : "error" });
      } catch (e) { applyStatus({ phase: "error" }); }
    }
  }

  // ─────────────────────────────────────────────
  // Polling (browser fallback)
  // ─────────────────────────────────────────────
  async function pollStatus() {
    try {
      const r = await fetch("/api/sync/status");
      const data = await r.json();
      applyStatus(data);
    } catch (e) {
      applyStatus({ isOnline: false, pendingCount });
    }
  }

  function startPolling() {
    pollStatus();
    pollInterval = setInterval(pollStatus, 15000);
  }

  // ─────────────────────────────────────────────
  // Init
  // ─────────────────────────────────────────────
  function init() {
    createStatusBar();
    createOfflineBanner();

    if (IS_ELECTRON && ipcRenderer) {
      // Listen for IPC messages from main process
      ipcRenderer.on("sync:status", (event, data) => applyStatus(data));
      ipcRenderer.on("sync:progress", (event, data) => {
        if (data && data.phase) { isSyncing = data.phase === "syncing" || data.phase === "uploading" || data.phase === "downloading"; renderStatusBar(); }
      });
      // Request current status
      ipcRenderer.invoke("sync:getStatus").then(applyStatus).catch(() => {});
    } else {
      startPolling();
    }

    // Export global
    window.GASC_SYNC = {
      manualSync,
      getIsOnline: () => isOnline,
      getPendingCount: () => pendingCount,
      showToast
    };
  }

  // Wait for DOM
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
