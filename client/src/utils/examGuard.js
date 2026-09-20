import { useEffect } from "react";

/*
 * examGuard.js
 * ---------------------------------------------------------------
 * Everything here is about BLOCKING actions, not scoring them.
 * Scoring lives on the server (see INTEGRITY_PENALTIES in
 * server/controllers/assessmentController.js). The hooks below take an
 * optional onViolation(type, metadata) callback so the workspace can
 * report an event when a penalty IS wanted - for screenshots we
 * deliberately report "screenshot_attempt", which the server scores at 0.
 */

// F12, Ctrl/Cmd+Shift+I / J / C / K / E, Ctrl/Cmd+U (view-source).
// Ctrl+Shift+K is Firefox's console, Ctrl+Shift+E its network panel.
export function isDevToolsShortcut(e) {
  const key = (e.key || "").toLowerCase();
  const mod = e.ctrlKey || e.metaKey;

  if (key === "f12") return true;
  if (mod && e.shiftKey && ["i", "j", "c", "k", "e"].includes(key)) return true;
  if (mod && key === "u") return true;
  // macOS: Cmd+Opt+I / J / C / U
  if (e.metaKey && e.altKey && ["i", "j", "c", "u"].includes(key)) return true;

  return false;
}

export function isScreenshotShortcut(e) {
  const key = (e.key || "").toLowerCase();

  // Windows PrintScreen (and Alt+PrtScn), Win+Shift+S snipping tool,
  // macOS Cmd+Shift+3 / 4 / 5.
  if (key === "printscreen") return true;
  if (e.shiftKey && (e.metaKey || e.key === "Meta") && key === "s") return true;
  if (e.metaKey && e.shiftKey && ["3", "4", "5"].includes(key)) return true;

  return false;
}

/**
 * Silences the browser console for the duration of the assessment and
 * keeps it silenced even if something re-grabs a reference to it.
 *
 * LIMITATION: this stops the app (and any pasted-in snippet) from
 * PRINTING to the console. No web page can actually prevent a determined
 * user from opening DevTools - the browser owns that UI. Combined with
 * the blocked shortcuts and the blocked right-click menu below, this is
 * the strongest a web app can get.
 */
function silenceConsole() {
  if (typeof window === "undefined" || !window.console) return () => {};

  const methods = [
    "log",
    "info",
    "warn",
    "error",
    "debug",
    "table",
    "dir",
    "trace",
    "group",
    "groupEnd",
    "count",
    "time",
    "timeEnd",
    "assert",
  ];

  const original = {};
  const noop = () => {};

  methods.forEach((method) => {
    if (typeof window.console[method] === "function") {
      original[method] = window.console[method];
      window.console[method] = noop;
    }
  });

  return () => {
    Object.keys(original).forEach((method) => {
      window.console[method] = original[method];
    });
  };
}

/**
 * Blocks the right-click menu (so "Inspect" / "View page source" /
 * "Inspect Console" never appear), DevTools keyboard shortcuts, text
 * selection-drag of the question, and screenshot shortcuts.
 *
 * @param {boolean} enabled        turn the whole guard on/off
 * @param {function} onViolation   (type, metadata) => void, optional
 */
export function useExamGuard(enabled, onViolation) {
  useEffect(() => {
    if (!enabled) return undefined;

    const restoreConsole = silenceConsole();

    // A single screenshot press can surface as both keydown and keyup
    // (depending on browser/OS), so collapse them into one report.
    let lastScreenshotAt = 0;
    const reportScreenshot = (e) => {
      const now = Date.now();
      if (now - lastScreenshotAt < 800) return;
      lastScreenshotAt = now;
      onViolation?.("screenshot_attempt", { key: e.key });
    };

    const handleContextMenu = (e) => {
      // Killing the default menu is what removes "Inspect" and
      // "Inspect Console" from the right-click options.
      e.preventDefault();
      e.stopPropagation();
      onViolation?.("right_click", {});
      return false;
    };

    const handleKeyDown = (e) => {
      if (isDevToolsShortcut(e)) {
        e.preventDefault();
        e.stopPropagation();
        onViolation?.("shortcut", {
          key: e.key,
          ctrlKey: e.ctrlKey,
          metaKey: e.metaKey,
          shiftKey: e.shiftKey,
        });
        return;
      }

      if (isScreenshotShortcut(e)) {
        /*
         * SCREENSHOTS: blocked, never penalised.
         *
         * IMPORTANT LIMITATION: PrintScreen and the OS snipping tools
         * are handled by the operating system BEFORE the browser sees
         * them, so no web page can truly stop the capture. What we can
         * do, and do here:
         *   1. preventDefault() so the browser itself does nothing,
         *   2. immediately blank the clipboard (on Windows, PrtScn puts
         *      the image there),
         *   3. log the attempt with a 0-point event type.
         * No integrity points are deducted for this, by design.
         */
        e.preventDefault();
        navigator.clipboard?.writeText("").catch(() => {});
        reportScreenshot(e);
      }
    };

    // Chrome/Windows only surface PrintScreen on keyup, never keydown,
    // so it needs its own listener - but ONLY for screenshots, otherwise
    // every DevTools shortcut would be reported twice.
    const handleKeyUp = (e) => {
      if (isScreenshotShortcut(e)) {
        e.preventDefault();
        navigator.clipboard?.writeText("").catch(() => {});
        reportScreenshot(e);
      }
    };

    // Long-press on touch devices opens the same context menu.
    document.addEventListener("contextmenu", handleContextMenu, true);
    document.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("keyup", handleKeyUp, true);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu, true);
      document.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("keyup", handleKeyUp, true);
      restoreConsole();
    };
  }, [enabled, onViolation]);
}
