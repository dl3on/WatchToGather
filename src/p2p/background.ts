async function ensureOffscreen() {
  if (await chrome.offscreen.hasDocument()) return;

  await chrome.offscreen.createDocument({
    url: "src/p2p/offscreen.html",
    reasons: ["WEB_RTC"],
    justification: "Keep Socket.IO connection alive for watch party",
  });
}

ensureOffscreen();
