import {
  getControlledTabId,
  loadRoomDetails,
  loadRoomUrl,
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
const roomNameInput = document.getElementById("roomName") as HTMLInputElement;
const webpageLinkInput = document.getElementById(
  "webpageLink",
) as HTMLInputElement;
const roomIdInput = document.getElementById("roomId") as HTMLInputElement;

const roomData = await loadRoomDetails();
const url = (await loadRoomUrl())?.url || "";
const controlledTabId = await getControlledTabId();

if (roomData) {
  const { roomId, roomName, participantsCount, host } = roomData;
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
      sendHostMsg(roomName, webpageLink);
      const { roomId } = await withTimeout(waitForHostSuccess(), 10000);

      hideLoadingUI();

      saveRoomDetails({
        roomId,
        roomName,
        participantsCount: 1,
        host: true,
      });
      saveRoomUrl(webpageLink);
      updateUIForRoom(roomId, roomName, 1, webpageLink, true, controlledTabId);
    } catch (error) {
      hideLoadingUI();
      console.error("[ERROR] Unable to host:", error);
      alert(`[WatchToGather] (Failed) ${error}`);
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
  const roomId = roomIdInput.value.trim();

  if (roomId !== "") {
    showLoadingUI("Joining room...");
    joinRoomModal.classList.add("hidden");

    try {
      sendJoinMsg(roomId);
      const { roomName, participantsCount } = await withTimeout(
        waitForJoinSuccess(),
        10000,
      );
      const currentUrl = (await loadRoomUrl())?.url || "";

      hideLoadingUI();

      saveRoomDetails({
        roomId,
        roomName,
        participantsCount: participantsCount + 1,
        host: false,
      });
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
