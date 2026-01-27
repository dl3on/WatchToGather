import { clearRoomDetails } from "../../common/chrome-storage";
import { requestLeaveRoom } from "../../common/chrome-utils";
import { PeerReadinessMap } from "../../common/sync-messages-types";
import { LeaveType } from "../../common/types";
import { registerCurrentTab } from "./chrome";

const roomIdContainer = document.getElementById(
  "roomIdContainer",
) as HTMLDivElement;
const roomIdTextElement = document.getElementById(
  "roomIdText",
) as HTMLParagraphElement;
const mainView = document.getElementById("mainView") as HTMLDivElement;
const createRoomModal = document.getElementById(
  "createRoomModal",
) as HTMLDivElement;
const joinRoomModal = document.getElementById(
  "joinRoomModal",
) as HTMLDivElement;

export function renderInitialView() {
  clearRoomDetails();
  console.log("Cleared room details");

  roomIdTextElement.textContent = "";
  roomIdContainer.classList.add("hidden");
  mainView.innerHTML = `
    <button id="createRoomBtn">Create Room</button>
    <button id="joinRoomBtn">Join Room</button>
  `;

  const createRoomBtn = document.getElementById(
    "createRoomBtn",
  ) as HTMLButtonElement;
  const joinRoomBtn = document.getElementById(
    "joinRoomBtn",
  ) as HTMLButtonElement;

  createRoomBtn.addEventListener("click", () => {
    createRoomModal.classList.remove("hidden");
  });

  joinRoomBtn.addEventListener("click", () => {
    joinRoomModal.classList.remove("hidden");
  });
}

export function updateUIForRoom(
  roomId: string,
  roomName: string,
  participantsCount: number,
  url: string,
  isHost: boolean,
  registeredTabId: number | null,
) {
  roomIdTextElement.textContent = `Room ID: ${roomId}`;
  roomIdContainer.classList.remove("hidden");
  mainView.innerHTML = `
    <div id="roomHeader">
      <p id="roomNameText"><strong>${roomName}</strong></p>
      <span id="roomParticipants">${participantsCount}👤</span>
      <span id="urlText" class="sub-text" data-url="${url}">${url}</span>
    </div>

    <div>
      <div id="roomActions">
        ${
          isHost
            ? `
          <button id="leaveRoomBtn">Disband Room</button>
          `
            : `
          <button id="leaveRoomBtn">Leave Room</button>
        `
        }
      </div>
      <div id="registerTab">
        <button id="registerTabBtn">Register Current Tab</button>
        ${
          registeredTabId !== null ? `` : `<p>No registered tab for syncing</p>`
        }
      </div>
    </div>
  `;

  const copyRoomIdBtn = document.getElementById(
    "copyRoomIdBtn",
  ) as HTMLButtonElement;
  const copyFeedback = document.getElementById(
    "copyFeedback",
  ) as HTMLSpanElement;
  const leaveRoomBtn = document.getElementById(
    "leaveRoomBtn",
  ) as HTMLButtonElement;
  const registerTabBtn = document.getElementById(
    "registerTabBtn",
  ) as HTMLButtonElement;
  const urlTextElement = document.getElementById("urlText") as HTMLSpanElement;

  if (copyRoomIdBtn) {
    copyRoomIdBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(roomId).then(() => {
        copyFeedback.classList.remove("hidden");

        setTimeout(() => {
          copyFeedback.classList.add("hidden");
        }, 1000);
      });
    });
  }

  if (leaveRoomBtn) {
    leaveRoomBtn.addEventListener("click", () => {
      const text = isHost ? "Disbanding room..." : "Leaving room...";
      showLoadingUI(text);
      requestLeaveRoom(LeaveType.Leave);
    });
  }

  if (registerTabBtn) {
    registerTabBtn.addEventListener("click", () => {
      registerCurrentTab();
    });
  }

  if (urlTextElement) {
    urlTextElement.addEventListener("click", () => {
      handleUrlNavigation(url, registeredTabId);
    });
  }
}

async function handleUrlNavigation(
  url: string,
  registeredTabId: number | null,
) {
  try {
    if (registeredTabId !== null) {
      await chrome.tabs.update(registeredTabId, { url: url, active: true });

      // Focus the window of the target tab
      const targetTab = await chrome.tabs.get(registeredTabId);
      if (targetTab.windowId) {
        await chrome.windows.update(targetTab.windowId, { focused: true });
      }
    } else {
      // No registered tab, create a new tab
      await chrome.tabs.create({ url: url, active: true });
    }
  } catch (error) {
    console.error("Failed to navigate to URL:", error);
  }
}

export function showLoadingUI(text: string) {
  const loadingOverlay = document.getElementById(
    "loadingOverlay",
  ) as HTMLDivElement;
  const loadingText = loadingOverlay.querySelector("p") as HTMLParagraphElement;

  loadingText.textContent = text;
  loadingOverlay.classList.remove("hidden");
}

export function hideLoadingUI() {
  const loadingOverlay = document.getElementById(
    "loadingOverlay",
  ) as HTMLDivElement;

  loadingOverlay.classList.add("hidden");
}

export function updateParticipantsCount(peerStateMap: PeerReadinessMap) {
  const participantCount = Object.keys(peerStateMap).length;

  const participantsElem = document.getElementById(
    "roomParticipants",
  ) as HTMLSpanElement | null;

  if (!participantsElem) return;

  participantsElem.textContent = `${participantCount}👤`;
}
