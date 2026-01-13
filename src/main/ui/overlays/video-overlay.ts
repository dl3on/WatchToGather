let overlayEl: HTMLDivElement | null = null;

function getOverlayRoot() {
  return document.fullscreenElement ?? document.documentElement;
}

function createOverlay() {
  if (overlayEl) return overlayEl;

  overlayEl = document.createElement("div");
  overlayEl.style.position = "absolute";
  overlayEl.style.zIndex = "2147483647";
  overlayEl.style.pointerEvents = "none";
  overlayEl.style.padding = "12px 20px";
  overlayEl.style.borderRadius = "8px";
  overlayEl.style.background = "rgba(0,0,0,0.7)";
  overlayEl.style.color = "#fff";
  overlayEl.style.fontSize = "16px";
  overlayEl.style.fontWeight = "600";
  overlayEl.style.transition = "opacity 0.2s";
  overlayEl.style.opacity = "0";

  const textEl = document.createElement("span");
  textEl.className = "overlay-text";

  const closeBtn = document.createElement("span");
  closeBtn.textContent = "x";
  closeBtn.style.pointerEvents = "auto";
  closeBtn.style.marginLeft = "12px";
  closeBtn.style.border = "none";
  closeBtn.style.color = "#fff";
  closeBtn.style.cursor = "pointer";
  closeBtn.style.fontSize = "14px";
  closeBtn.style.fontFamily = "Arial, sans-serif";

  closeBtn.style.opacity = "0.8";

  closeBtn.onmouseenter = () => {
    closeBtn.style.color = "#ffb4b4"; // light red
    closeBtn.style.opacity = "1";
  };

  closeBtn.onmouseleave = () => {
    closeBtn.style.color = "#fff";
    closeBtn.style.opacity = "0.8";
  };

  overlayEl.appendChild(textEl);
  overlayEl.appendChild(closeBtn);

  closeBtn.onclick = () => {
    overlayEl!.style.opacity = "0";
  };

  const root = getOverlayRoot();
  root.appendChild(overlayEl);
  return overlayEl;
}

function positionOverlay(video: HTMLVideoElement) {
  const overlay = createOverlay();

  const rect = video.getBoundingClientRect();

  overlay.style.left = `${rect.left + rect.width / 2}px`;
  overlay.style.top = `${rect.top + rect.height / 2}px`;
  overlay.style.transform = "translate(-50%, -50%)";
}

function bindReposition(video: HTMLVideoElement) {
  const reposition = () => {
    if (!overlayEl) return;

    const root = document.fullscreenElement ?? document.documentElement;

    // Move overlay if root changed
    if (overlayEl.parentElement !== root) {
      root.appendChild(overlayEl);
    }

    positionOverlay(video);
  };

  window.addEventListener("resize", reposition);
  document.addEventListener("fullscreenchange", reposition);

  reposition();
}

export function showVideoOverlay(video: HTMLVideoElement, text: string) {
  if (!video) return;

  const overlay = createOverlay();
  const textEl = overlay.querySelector(".overlay-text") as HTMLElement;

  textEl.textContent = text;

  bindReposition(video);
  overlay.style.opacity = "1";
}

export function hideVideoOverlay() {
  if (!overlayEl) return;
  overlayEl.style.opacity = "0";
}
