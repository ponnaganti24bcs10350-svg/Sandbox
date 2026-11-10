import { useEffect } from "react";

// Fingerprints of common AI-assistant browser extensions/sidebars that
// inject their own floating button, panel or iframe into every page a
// user visits (ChatGPT, Gemini, Copilot, Claude, Bard, Perplexity, Sider,
// Monica, and generic "ai-assistant" widgets).
const SUSPICIOUS_PATTERNS = [
  /chat[-_ ]?gpt/i,
  /gemini/i,
  /copilot/i,
  /claude/i,
  /\bbard\b/i,
  /perplexity/i,
  /ai[-_ ]?assistant/i,
  /sider/i,
  /monica/i,
];

function looksLikeAIOverlay(node) {
  if (!(node instanceof HTMLElement)) return false;

  const fingerprint = `${node.id || ""} ${node.className || ""}`;
  if (SUSPICIOUS_PATTERNS.some((re) => re.test(fingerprint))) return true;

  if (node.tagName === "IFRAME") {
    const src = node.getAttribute("src") || "";
    if (SUSPICIOUS_PATTERNS.some((re) => re.test(src))) return true;
  }

  // Common pattern for injected sidebar/overlay widgets: a fixed-position
  // element with an unusually high z-index our own app never creates.
  const zIndex = parseInt(node.style?.zIndex || "0", 10);
  if (node.style?.position === "fixed" && zIndex > 999999) return true;

  return false;
}

/**
 * Best-effort, site-wide removal of AI-assistant extension overlays.
 *
 * IMPORTANT LIMITATION (please read before relying on this): a web page
 * cannot disable, uninstall, or otherwise reach into a browser extension -
 * extensions run in a sandboxed context page JS is not allowed to touch.
 * What this hook CAN do is watch the page's own DOM for the visible UI such
 * extensions inject (a floating launcher button, a sidebar <div>, an
 * <iframe>) and remove that element as soon as it appears, so it doesn't
 * sit on top of the app. It cannot stop a user from opening the extension
 * in its own separate popup/window, and it cannot detect every extension -
 * only ones that match the fingerprints above.
 *
 * Mount this once near the top of the app (see App.jsx) so it runs on every
 * page, not just the assessment workspace.
 */
export function useBlockAIOverlays({ onBlocked } = {}) {
  useEffect(() => {
    function remove(node) {
      try {
        node.remove();
        if (onBlocked) onBlocked(node);
      } catch (_) {
        // Best effort - some nodes (e.g. inside a closed shadow root, or a
        // cross-origin iframe's contents) simply can't be touched from
        // page JS. Silently move on.
      }
    }

    // Sweep whatever is already in the DOM at mount time.
    document.body.querySelectorAll("[id],[class]").forEach((node) => {
      if (looksLikeAIOverlay(node)) remove(node);
    });

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (looksLikeAIOverlay(node)) remove(node);
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [onBlocked]);
}
