(function () {
  const head = document.head;
  const DISMISS_KEY = "applymate-install-dismissed-at";
  const DISMISS_DAYS = 7;
  let deferredPrompt = null;
  let banner = null;

  if (head && !document.querySelector('link[rel="manifest"]')) {
    const manifest = document.createElement("link");
    manifest.rel = "manifest";
    manifest.href = "manifest.webmanifest";
    head.appendChild(manifest);
  }

  if (head && !document.querySelector('meta[name="theme-color"]')) {
    const theme = document.createElement("meta");
    theme.name = "theme-color";
    theme.content = "#2563eb";
    head.appendChild(theme);
  }

  if (head && !document.querySelector('link[href="pwa-install.css"]')) {
    const styles = document.createElement("link");
    styles.rel = "stylesheet";
    styles.href = "pwa-install.css";
    head.appendChild(styles);
  }

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("service-worker.js").catch((error) => {
        console.warn("ApplyMate service worker registration failed:", error);
      });
    });
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;

    if (!isInstalled() && !wasRecentlyDismissed()) {
      showInstallBanner();
    }
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    removeBanner();
    localStorage.removeItem(DISMISS_KEY);
  });

  function showInstallBanner() {
    if (banner || !deferredPrompt || !document.body) return;

    banner = document.createElement("aside");
    banner.className = "pwa-install-banner";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-label", "Install ApplyMate India");

    const title = document.createElement("h2");
    title.textContent = "Install ApplyMate India";

    const message = document.createElement("p");
    message.textContent = "Add ApplyMate to your device for quicker access and basic offline support.";

    const actions = document.createElement("div");
    actions.className = "pwa-install-actions";

    const installButton = document.createElement("button");
    installButton.type = "button";
    installButton.className = "pwa-install-primary";
    installButton.textContent = "Install";
    installButton.addEventListener("click", installApp);

    const dismissButton = document.createElement("button");
    dismissButton.type = "button";
    dismissButton.className = "pwa-install-secondary";
    dismissButton.textContent = "Not now";
    dismissButton.addEventListener("click", dismissBanner);

    actions.append(installButton, dismissButton);
    banner.append(title, message, actions);
    document.body.appendChild(banner);
  }

  async function installApp() {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();

    try {
      await deferredPrompt.userChoice;
    } finally {
      deferredPrompt = null;
      removeBanner();
    }
  }

  function dismissBanner() {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // Ignore unavailable storage and simply hide the prompt for this page view.
    }

    removeBanner();
  }

  function wasRecentlyDismissed() {
    try {
      const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
      const maxAge = DISMISS_DAYS * 24 * 60 * 60 * 1000;
      return dismissedAt > 0 && Date.now() - dismissedAt < maxAge;
    } catch {
      return false;
    }
  }

  function isInstalled() {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true
    );
  }

  function removeBanner() {
    if (banner) {
      banner.remove();
      banner = null;
    }
  }
})();
