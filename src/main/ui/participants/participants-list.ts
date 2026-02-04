import { PeerReadinessMap } from "../../../common/sync-messages-types";

function getParticipantsListContainer() {
  let container = document.getElementById(
    "watchtogather-participants-list-container",
  );
  if (!container) {
    container = document.createElement("div");
    container.id = "watchtogather-participants-list-container";

    container.style.position = "fixed";
    container.style.height = "fit-content";
    container.style.top = "50%";
    container.style.left = "0px";
    container.style.transform = "translateY(-50%)";
    container.style.zIndex = "2147483647";
    container.style.background = "transparent";
    container.style.color = "#e6e6e6";
    container.style.padding = "0px";
    container.style.fontFamily = "system-ui, sans-serif";
    container.style.display = "flex";
    container.style.alignItems = "stretch";

    const panel = document.createElement("div");
    panel.style.display = "flex";
    panel.style.alignItems = "center";
    panel.style.position = "relative";
    panel.style.overflow = "visible";

    const title = document.createElement("div");
    title.textContent = "Participants";
    title.style.display = "block";
    title.style.fontWeight = "600";
    title.style.fontSize = "13px";

    const divider = document.createElement("div");
    divider.style.height = "1px";
    divider.style.background = "rgba(255,255,255,0.25)";
    divider.style.margin = "6px 0";

    const content = document.createElement("div");
    content.style.display = "block";
    content.style.background = "#a7a7ffff";
    content.style.borderRadius = "0 12px 12px 0";
    content.style.boxShadow = "0 10px 25px rgba(0,0,0,0.4)";
    content.style.padding = "10px";
    content.style.minWidth = "220px";

    const list = document.createElement("div");
    list.id = "watchtogather-participants-list";
    list.style.display = "flex";
    list.style.flexDirection = "column";
    list.style.gap = "6px";

    const toggleBtn = document.createElement("button");
    toggleBtn.style.zIndex = "1";

    toggleBtn.textContent = "<";
    toggleBtn.style.all = "unset";
    toggleBtn.style.cursor = "pointer";
    toggleBtn.style.width = "14px";
    toggleBtn.style.height = "35px";
    toggleBtn.style.fontSize = "14px";
    toggleBtn.style.fontWeight = "600";
    toggleBtn.style.display = "flex";
    toggleBtn.style.alignItems = "center";
    toggleBtn.style.justifyContent = "center";
    toggleBtn.style.background = "#a7a7ffff";
    toggleBtn.style.borderRadius = "0 8px 8px 0";

    content.append(title, divider, list);
    panel.append(content, toggleBtn);
    container.append(panel);

    let open = true;

    toggleBtn.onclick = () => {
      open = !open;

      if (open) {
        toggleBtn.textContent = "<";
        content.style.display = "block";
      } else {
        toggleBtn.textContent = ">";
        content.style.display = "none";
      }
    };

    document.body.appendChild(container);

    function updateFullscreenVisibility() {
      if (document.fullscreenElement) {
        container!.style.display = "none";
      } else {
        container!.style.display = "block";
      }
    }
    document.addEventListener("fullscreenchange", updateFullscreenVisibility);
  }

  return container;
}

export function updateParticipantsList(readinessMap: PeerReadinessMap) {
  const container = getParticipantsListContainer();
  const list = container.querySelector(
    "#watchtogather-participants-list",
  ) as HTMLDivElement;

  const rows = new Map(
    Array.from(list.children).map((row) => [
      (row as HTMLElement).dataset.peerId!,
      row as HTMLElement,
    ]),
  );

  for (const [peerId, { username, ready }] of Object.entries(readinessMap)) {
    let row = rows.get(peerId);

    if (!row) {
      row = document.createElement("div");
      row.dataset.peerId = peerId;

      row.style.display = "flex";
      row.style.alignItems = "center";
      row.style.gap = "8px";
      row.style.fontSize = "12px";

      const name = document.createElement("div");
      name.textContent = username;
      name.style.flex = "1";

      const status = document.createElement("div");
      status.className = "watchtogather-ready-text";
      status.style.fontSize = "11px";
      status.style.fontWeight = "500";
      status.style.opacity = "0.9";

      row.append(name, status);
      list.appendChild(row);
    }

    const status = row.querySelector(
      ".watchtogather-ready-text",
    ) as HTMLDivElement;

    status.textContent = ready ? "Ready" : "Not Ready";
    status.style.color = ready ? "green" : "#c77d00";
    rows.delete(peerId);
  }

  // remove missing
  for (const row of rows.values()) {
    row.remove();
  }
}

export function removeParticipantsList() {
  let container = document.getElementById(
    "watchtogather-participants-list-container",
  );

  container?.remove();
}
