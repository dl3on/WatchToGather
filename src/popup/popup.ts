import { isValidUrl } from "../common/utils";
import {
  loadRegisteredTabId,
  loadRoomDetails,
  registerTabListener,
  saveRoomDetails,
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
const registeredTabId = await loadRegisteredTabId();
if (roomData) {
  const { roomId, roomName, participantsCount, url, host } = roomData;
  const hasRegisteredTab = registeredTabId !== null ? true : false;
  updateUIForRoom(
    roomId,
    roomName,
    participantsCount,
    url,
    host,
    hasRegisteredTab
  );
} else {
  renderInitialView();
}

registerTabListener();

// Create Room
confirmCreateBtn.addEventListener("click", async () => {
  const roomName = roomNameInput.value.trim();
  const webpageLink = webpageLinkInput.value.trim();

  if (roomName !== "" && webpageLink !== "") {
    if (!isValidUrl(webpageLink)) {
      alert("Invalid link");
      return;
    }

    console.log("Creating room:", roomName);
    sendHostMsg(roomName, webpageLink);

    try {
      const { roomId } = await waitForHostSuccess();

      saveRoomDetails({
        roomId,
        roomName,
        participantsCount: 1,
        url: webpageLink,
        host: true,
      });
      updateUIForRoom(roomId, roomName, 1, webpageLink, true, false);
      createRoomModal.classList.add("hidden");
    } catch (e) {
      console.error("[ERROR] Unable to host:", e);
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
    console.log("Joining room:", roomId);
    sendJoinMsg(roomId);

    joinRoomModal.classList.add("hidden");

    try {
      const { roomName, participantsCount, currentUrl } =
        await waitForJoinSuccess();

      saveRoomDetails({
        roomId,
        roomName,
        participantsCount: participantsCount + 1,
        url: currentUrl,
        host: false,
      });
      updateUIForRoom(
        roomId,
        roomName,
        participantsCount + 1,
        currentUrl,
        false,
        false
      );
    } catch (e) {
      console.error(`[ERROR] Unable to join Room ${roomId}:`, e);
    }
  } else {
    console.log("Room ID required!");
  }
});

cancelJoinBtn.addEventListener("click", () => {
  joinRoomModal.classList.add("hidden");
});
