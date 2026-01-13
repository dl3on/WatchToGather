import { PeerNextVideoMessage } from "../../../common/sync-messages-types";

function getNotifContainer() {
  let container = document.getElementById(
    "watchtogather-next-video-notif-container"
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
    container.style.gap = "10px";
    document.body.appendChild(container);
  }

  return container;
}

export function showNextVideoNotif(msg: PeerNextVideoMessage) {
  const { fromPeerId, fromHost, url } = msg;

  const container = getNotifContainer();
  container.querySelector(`[data-peer-id="${fromPeerId}"]`)?.remove();

  const notif = document.createElement("div");
  notif.dataset.peerId = fromPeerId;

  notif.style.background = "#a7a7ffff";
  notif.style.color = "black";
  notif.style.padding = "12px 16px";
  notif.style.borderRadius = "12px";
  notif.style.boxShadow = "0 10px 25px rgba(0,0,0,0.4)";
  notif.style.fontFamily = "system-ui, sans-serif";
  notif.style.maxWidth = "300px";

  // TODO: improve styling
  notif.innerHTML = `
    <div style="font-weight:600; margin-bottom:4px;">
      ${
        fromHost
          ? "Host updated next video:"
          : `${fromPeerId} suggested a video:`
      }
    </div>
    <a
      href="${url}"
      target="_self"
      style="
        margin-top:5px;
        font-size:10px;
        color: rgb(51, 50, 50);
        word-break:break-word;
      "
      rel="noopener noreferrer"
    >
      ${url}
    </a>
    <div style="display:flex; justify-content:flex-center;">
      <button class="watchtogather-dismiss-notif-btn">Dismiss</button>
    </div>
  `;

  notif
    .querySelector(".watchtogather-dismiss-notif-btn")!
    .addEventListener("click", () => {
      notif.remove();
    });

  container.appendChild(notif);
}
