import {
  getControlledTabId,
  getParticipantsCount,
  loadRoomDetails,
  loadRoomUrl,
  saveParticipantsCount,
  saveRoomDetails,
  saveRoomUrl,
} from "../common/chrome-storage";
import { isValidUrl, withTimeout } from "../common/utils";
import {
  sendHostMsg,
  sendJoinMsg,
  waitForHostSuccess,
  waitForJoinSuccess,
} from "./lib/chrome";
import {
  hideLoadingUI,
  renderInitialView,
  showLoadingUI,
  updateParticipantsCount,
  updateUIForRoom,
} from "./lib/ui";

const createRoomModal = document.getElementById(
  "createRoomModal",
) as HTMLDivElement;
const confirmCreateBtn = document.getElementById(
  "confirmCreateBtn",
) as HTMLButtonElement;
const cancelCreateBtn = document.getElementById(
  "cancelCreateBtn",
) as HTMLButtonElement;
const joinRoomModal = document.getElementById(
  "joinRoomModal",
) as HTMLDivElement;
const confirmJoinBtn = document.getElementById(
  "confirmJoinBtn",
) as HTMLButtonElement;
const cancelJoinBtn = document.getElementById(
  "cancelJoinBtn",
) as HTMLButtonElement;
const hostUsernameInput = document.getElementById(
  "hostUsername",
) as HTMLInputElement;
const joinerUsernameInput = document.getElementById(
  "joinerUsername",
) as HTMLInputElement;
const roomNameInput = document.getElementById("roomName") as HTMLInputElement;
const webpageLinkInput = document.getElementById(
  "webpageLink",
) as HTMLInputElement;
const roomIdInput = document.getElementById("roomId") as HTMLInputElement;

const roomData = await loadRoomDetails();
const participantsCount = await getParticipantsCount();
const url = (await loadRoomUrl())?.url || "";
const controlledTabId = await getControlledTabId();

if (roomData && participantsCount) {
  const { roomId, roomName, host } = roomData;
  updateUIForRoom(
    roomId,
    roomName,
    participantsCount,
    url,
    host,
    controlledTabId,
  );
} else {
  renderInitialView();
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "REFRESH_PAGE_ALERT") {
    alert(msg.text);
  }

  if (msg.type === "READINESS_UPDATE") {
    updateParticipantsCount(msg.readinessMap);
    return;
  }

  if (msg.type === "DISBANDING_ROOM") {
    showLoadingUI("Room is being disbanded...");
    return;
  }
  if (msg.type === "ROOM_DISBANDED" || msg.type === "LEFT_ROOM") {
    hideLoadingUI();
    renderInitialView();
    return;
  }
});

// Create Room
confirmCreateBtn.addEventListener("click", async () => {
  const username = hostUsernameInput.value.trim();
  const roomName = roomNameInput.value.trim();
  const webpageLink = webpageLinkInput.value.trim();

  if (roomName !== "" && webpageLink !== "") {
    if (!isValidUrl(webpageLink)) {
      alert("[WatchToGather] Invalid link");
      return;
    }

    showLoadingUI("Creating room...");
    createRoomModal.classList.add("hidden");

    try {
      sendHostMsg(username, roomName, webpageLink);
      const { roomId } = await withTimeout(waitForHostSuccess(), 10000);

      hideLoadingUI();

      saveRoomDetails({
        roomId,
        roomName,
        host: true,
      });
      saveParticipantsCount(1);
      saveRoomUrl(webpageLink);
      updateUIForRoom(roomId, roomName, 1, webpageLink, true, controlledTabId);
    } catch (error) {
      hideLoadingUI();
      console.error("[ERROR] Unable to host:", error);
      alert(`[WatchToGather] ${error}`);
    }
  } else {
    console.log("Fill in all the fields.");
  }
});

cancelCreateBtn.addEventListener("click", () => {
  createRoomModal.classList.add("hidden");
});

// Join Room
confirmJoinBtn.addEventListener("click", async () => {
  const username = joinerUsernameInput.value.trim();
  const roomId = roomIdInput.value.trim();

  if (roomId !== "") {
    showLoadingUI("Joining room...");
    joinRoomModal.classList.add("hidden");

    try {
      sendJoinMsg(roomId, username);
      const { roomName, participantsCount } = await withTimeout(
        waitForJoinSuccess(),
        10000,
      );
      const currentUrl = (await loadRoomUrl())?.url || "";

      hideLoadingUI();

      saveRoomDetails({
        roomId,
        roomName,
        host: false,
      });
      saveParticipantsCount(participantsCount + 1);
      updateUIForRoom(
        roomId,
        roomName,
        participantsCount + 1,
        currentUrl,
        false,
        controlledTabId,
      );
    } catch (error) {
      hideLoadingUI();
      console.error(`[ERROR] Unable to join Room ${roomId}:`, error);
      alert(
        `[WatchToGather] Unable to join Room ${roomId}. Please check the Room ID and try again.`,
      );
    }
  } else {
    console.log("Room ID required!");
  }
});

cancelJoinBtn.addEventListener("click", () => {
  joinRoomModal.classList.add("hidden");
});
