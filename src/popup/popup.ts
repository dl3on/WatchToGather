import {
  getControlledTabId,
  loadRoomDetails,
  loadRoomUrl,
  saveRoomDetails,
  saveRoomUrl,
} from "../common/chrome-storage";
import { isValidUrl } from "../common/utils";
import {
  sendHostMsg,
  sendJoinMsg,
  waitForHostSuccess,
  waitForJoinSuccess,
} from "./lib/chrome";
import { renderInitialView, updateUIForRoom } from "./lib/ui";

const createRoomModal = document.getElementById(
  "createRoomModal"
) as HTMLDivElement;
const confirmCreateBtn = document.getElementById(
  "confirmCreateBtn"
) as HTMLButtonElement;
const cancelCreateBtn = document.getElementById(
  "cancelCreateBtn"
) as HTMLButtonElement;
const joinRoomModal = document.getElementById(
  "joinRoomModal"
) as HTMLDivElement;
const confirmJoinBtn = document.getElementById(
  "confirmJoinBtn"
) as HTMLButtonElement;
const cancelJoinBtn = document.getElementById(
  "cancelJoinBtn"
) as HTMLButtonElement;
const roomNameInput = document.getElementById("roomName") as HTMLInputElement;
const webpageLinkInput = document.getElementById(
  "webpageLink"
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
    controlledTabId
  );
} else {
  renderInitialView();
}

// Create Room
confirmCreateBtn.addEventListener("click", async () => {
  const roomName = roomNameInput.value.trim();
  const webpageLink = webpageLinkInput.value.trim();

  if (roomName !== "" && webpageLink !== "") {
    if (!isValidUrl(webpageLink)) {
      alert("[WatchToGather] Invalid link");
      return;
    }

    const loadingOverlay = document.getElementById(
      "loadingOverlay"
    ) as HTMLDivElement;
    const loadingText = loadingOverlay.querySelector(
      "p"
    ) as HTMLParagraphElement;
    loadingText.textContent = "Creating room...";
    loadingOverlay.classList.remove("hidden");
    createRoomModal.classList.add("hidden");

    try {
      sendHostMsg(roomName, webpageLink);

      const hostPromise = waitForHostSuccess();
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error("Host request timed out"));
        }, 10000); // 10 seconds timeout
      });
      const { roomId } = await Promise.race([hostPromise, timeoutPromise]);

      loadingOverlay.classList.add("hidden");

      saveRoomDetails({
        roomId,
        roomName,
        participantsCount: 1,
        host: true,
      });
      saveRoomUrl(webpageLink);
      updateUIForRoom(roomId, roomName, 1, webpageLink, true, controlledTabId);
    } catch (e) {
      loadingOverlay.classList.add("hidden");
      console.error("[ERROR] Unable to host:", e);
      alert(`[WatchToGather] (Failed) ${e}`);
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
    const loadingOverlay = document.getElementById(
      "loadingOverlay"
    ) as HTMLDivElement;
    const loadingText = loadingOverlay.querySelector(
      "p"
    ) as HTMLParagraphElement;
    loadingText.textContent = "Joining room...";
    loadingOverlay.classList.remove("hidden");
    joinRoomModal.classList.add("hidden");

    try {
      sendJoinMsg(roomId);

      const joinPromise = waitForJoinSuccess();
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error("Join request timed out"));
        }, 10000); // 10 seconds timeout
      });
      const { roomName, participantsCount } = await Promise.race([
        joinPromise,
        timeoutPromise,
      ]);
      const currentUrl = (await loadRoomUrl())?.url || "";

      loadingOverlay.classList.add("hidden");

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
        controlledTabId
      );
    } catch (e) {
      loadingOverlay.classList.add("hidden");
      console.error(`[ERROR] Unable to join Room ${roomId}:`, e);
      alert(
        `[WatchToGather] Unable to join Room ${roomId}. Please check the Room ID and try again.`
      );
    }
  } else {
    console.log("Room ID required!");
  }
});

cancelJoinBtn.addEventListener("click", () => {
  joinRoomModal.classList.add("hidden");
});
