function getParticipantsListContainer() {
  let container = document.getElementById(
    "watchtogather-participants-list-container"
  );
  if (!container) {
    container = document.createElement("div");
    container.id = "watchtogather-participants-list-container";

    container.style.position = "fixed";
    container.style.top = "20px";
    container.style.left = "20px";
    container.style.zIndex = "2147483647";
    container.style.background = "#a7a7ffff";
    container.style.color = "#e6e6e6";
    container.style.borderRadius = "12px";
    container.style.boxShadow = "0 10px 25px rgba(0,0,0,0.4)";
    container.style.padding = "10px";
    container.style.fontFamily = "system-ui, sans-serif";
    container.style.display = "block";
    container.style.minWidth = "220px";

    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.justifyContent = "space-between";
    header.style.alignItems = "center";
    header.style.marginBottom = "6px";

    const title = document.createElement("div");
    title.textContent = "Participants";
    title.style.display = "block";
    title.style.fontWeight = "600";
    title.style.fontSize = "13px";

    const toggleBtn = document.createElement("button");
    toggleBtn.textContent = "x";
    toggleBtn.style.all = "unset";
    toggleBtn.style.cursor = "pointer";
    toggleBtn.style.font = "inherit";
    toggleBtn.style.fontSize = "14px";
    toggleBtn.style.fontWeight = "600";
    toggleBtn.style.color = "inherit";
    toggleBtn.style.padding = "0";
    toggleBtn.style.margin = "0";
    toggleBtn.style.background = "none";
    toggleBtn.style.border = "none";

    header.append(title, toggleBtn);
    container.appendChild(header);

    const divider = document.createElement("div");
    divider.style.height = "1px";
    divider.style.background = "rgba(255,255,255,0.25)";
    divider.style.margin = "6px 0";

    container.appendChild(divider);

    const list = document.createElement("div");
    list.id = "watchtogather-participants-list";
    list.style.display = "flex";
    list.style.flexDirection = "column";
    list.style.gap = "6px";

    container.appendChild(list);

    const OPEN_PADDING = "10px";
    const CLOSED_PADDING = "6px 8px";
    let open = true;

    toggleBtn.onmouseenter = () => {
      toggleBtn.style.color = "black";
    };
    toggleBtn.onmouseleave = () => {
      toggleBtn.style.color = "inherit";
    };
    toggleBtn.onclick = () => {
      open = !open;

      if (open) {
        title.style.display = "block";
        toggleBtn.textContent = "X";
        divider.style.display = "block";
        list.style.display = "flex";
        container!.style.padding = OPEN_PADDING;
        container!.style.minWidth = "220px";
      } else {
        title.style.display = "none";
        toggleBtn.textContent = "Show Participants";
        divider.style.display = "none";
        list.style.display = "none";
        container!.style.padding = CLOSED_PADDING;
        container!.style.minWidth = "unset";
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

export function updateParticipantsList(readinessMap: Record<string, boolean>) {
  const container = getParticipantsListContainer();
  const list = container.querySelector(
    "#watchtogather-participants-list"
  ) as HTMLDivElement;

  const rows = new Map(
    Array.from(list.children).map((row) => [
      (row as HTMLElement).dataset.peerId!,
      row as HTMLElement,
    ])
  );

  for (const [peerId, ready] of Object.entries(readinessMap)) {
    let row = rows.get(peerId);

    if (!row) {
      row = document.createElement("div");
      row.dataset.peerId = peerId;

      row.style.display = "flex";
      row.style.alignItems = "center";
      row.style.gap = "8px";
      row.style.fontSize = "12px";

      const name = document.createElement("div");
      name.textContent = peerId;
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
      ".watchtogather-ready-text"
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
    "watchtogather-participants-list-container"
  );
  if (container) container.remove();
}
