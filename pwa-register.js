(function () {
  const head = document.head;
  const DISMISS_KEY = "applymate-install-dismissed-at";
  const DISMISS_DAYS = 7;
  let deferredPrompt = null;
  let banner = null;
  let updateBanner = null;
  let waitingWorker = null;
  let reloading = false;

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
    window.addEventListener("load", async () => {
      try {
        const registration = await navigator.serviceWorker.register("service-worker.js");

        if (registration.waiting) {
          waitingWorker = registration.waiting;
          showUpdateBanner();
        }

        registration.addEventListener("updatefound", () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;

          installingWorker.addEventListener("statechange", () => {
            if (
              installingWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              waitingWorker = registration.waiting || installingWorker;
              showUpdateBanner();
            }
          });
        });

        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (reloading) return;
          reloading = true;
          window.location.reload();
        });
      } catch (error) {
        console.warn("ApplyMate service worker registration failed:", error);
      }
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

  function showUpdateBanner() {
    if (updateBanner || !waitingWorker || !document.body) return;

    updateBanner = document.createElement("aside");
    updateBanner.className = "pwa-install-banner";
    updateBanner.setAttribute("role", "status");
    updateBanner.setAttribute("aria-label", "ApplyMate update available");

    const title = document.createElement("h2");
    title.textContent = "New ApplyMate version available";

    const message = document.createElement("p");
    message.textContent = "Refresh now to use the latest improvements.";

    const actions = document.createElement("div");
    actions.className = "pwa-install-actions";

    const refreshButton = document.createElement("button");
    refreshButton.type = "button";
    refreshButton.className = "pwa-install-primary";
    refreshButton.textContent = "Update now";
    refreshButton.addEventListener("click", activateUpdate);

    const laterButton = document.createElement("button");
    laterButton.type = "button";
    laterButton.className = "pwa-install-secondary";
    laterButton.textContent = "Later";
    laterButton.addEventListener("click", removeUpdateBanner);

    actions.append(refreshButton, laterButton);
    updateBanner.append(title, message, actions);
    document.body.appendChild(updateBanner);
  }

  function activateUpdate() {
    if (!waitingWorker) return;
    waitingWorker.postMessage({ type: "ACTIVATE_NEW_VERSION" });
  }

  function removeUpdateBanner() {
    if (updateBanner) {
      updateBanner.remove();
      updateBanner = null;
    }
  }

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
      // Ignore unavailable storage and hide the prompt for this page view.
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
