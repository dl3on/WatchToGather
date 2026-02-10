import { PeerNextVideoMessage } from "../../../common/sync-messages-types";

(function injectNotifStyles() {
  if (document.getElementById("watchtogather-notif-styles")) return;

  const style = document.createElement("style");
  style.id = "watchtogather-notif-styles";
  style.textContent = `
    .watchtogather-notif {
      transition:
        transform 0.25s ease,
        opacity 0.2s ease;
    }

    .watchtogather-notif.enter {
      transform: translateX(20px);
      opacity: 0;
    }

    .watchtogather-notif.enter-active {
      transform: translateX(0);
      opacity: 1;
    }

    .watchtogather-notif.exit {
      transform: translateX(20px);
      opacity: 0;
    }

    .watchtogather-close-btn:hover {
      text-decoration: underline !important;
    }

    a.watchtogather-notif-link:hover {
      text-decoration: underline !important;
    }
  `;
  document.head.appendChild(style);
})();

function getNotifContainer() {
  let container = document.getElementById(
    "watchtogather-next-video-notif-container",
  );
  if (!container) {
    console.log("Creating notification container");
    container = document.createElement("div");
    container.id = "watchtogather-next-video-notif-container";
    container.style.position = "fixed";
    container.style.top = "20px";
    container.style.right = "20px";
    container.style.zIndex = "2147483647";
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.alignItems = "flex-end";
    container.style.gap = "10px";
    document.body.appendChild(container);
  }

  return container;
}

export function destroyNotifContainer() {
  const container = document.getElementById(
    "watchtogather-next-video-notif-container",
  );

  container?.remove();
}

export function showNextVideoNotif(msg: PeerNextVideoMessage) {
  const { fromPeerId, username, fromHost, url } = msg;

  const container = getNotifContainer();
  container.querySelector(`[data-peer-id="${fromPeerId}"]`)?.remove();

  const notif = document.createElement("div");
  notif.className = "watchtogather-notif";
  notif.classList.add("enter");
  notif.dataset.peerId = fromPeerId;

  notif.style.position = "relative";
  notif.style.background = "#a7a7ffff";
  notif.style.color = "#000";
  notif.style.padding = "14px 16px";
  notif.style.borderRadius = "14px";
  notif.style.boxShadow = "0 8px 20px rgba(0,0,0,0.25)";
  notif.style.fontFamily =
    "system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  notif.style.maxWidth = "320px";

  notif.innerHTML = `
  <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
    <div style="font-weight:600; font-size:14px; line-height:1.3;">
      ${
        fromHost
          ? "🎬 Host updated the next video"
          : `👤 ${username} suggested a video`
      }
    </div>

    <button
      class="watchtogather-close-btn"
      aria-label="Dismiss notification"
      style="
        position:absolute;
        top: 8px;
        right: 8px;
        width:24px;
        height:24px;
        border:none;
        background:transparent;
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:16px;
        font-weight:600;
        cursor:pointer;
        color:#000;
      "
    >
      ×
    </button>
  </div>

  <a
    class="watchtogather-notif-link"
    href="${url}"
    target="_self"
    rel="noopener noreferrer"
    style="
      display:block;
      margin-top:6px;
      font-size:12px;
      color:#000;
      word-break:break-word;
      text-decoration:none;
      cursor:pointer;
    "
  >
    ${url}
  </a>
`;

  notif
    .querySelector(".watchtogather-close-btn")!
    .addEventListener("click", () => {
      notif.classList.add("exit");
      notif.addEventListener("transitionend", () => notif.remove(), {
        once: true,
      });
    });

  container.prepend(notif);

  requestAnimationFrame(() => {
    notif.classList.add("enter-active");
    notif.classList.remove("enter");
  });
}
