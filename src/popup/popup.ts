import {
  loadRoomDetails,
  saveRoomDetails,
  sendHostMsg,
  sendJoinMsg,
  waitForHostSuccess,
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
if (roomData) {
  const { roomId, roomName, participantsCount, host } = roomData;
  updateUIForRoom(roomId, roomName, participantsCount, host);
} else {
  renderInitialView();
}

// Create Room
confirmCreateBtn.addEventListener("click", async () => {
  const roomName = roomNameInput.value.trim();
  const webpageLink = webpageLinkInput.value.trim();

  if (roomName !== "" && webpageLink !== "") {
    console.log("Creating room:", roomName);
    sendHostMsg();

    try {
      const { roomId } = await waitForHostSuccess();

      saveRoomDetails({
        roomId,
        roomName,
        participantsCount: 1,
        host: true,
      });
      updateUIForRoom(roomId, roomName, 1, true);
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
confirmJoinBtn.addEventListener("click", () => {
  const roomId = roomIdInput.value.trim();

  if (roomId !== "") {
    console.log("Joining room:", roomId);
    sendJoinMsg(roomId);

    joinRoomModal.classList.add("hidden");
    // TODO: obtain room name, roomId, and number of participants
    const roomName = "roomName";
    const participants = 2;

    saveRoomDetails({
      roomId,
      roomName,
      participantsCount: participants,
      host: false,
    });
    updateUIForRoom(roomId, roomName, participants, false);
  } else {
    console.log("Room ID required!");
  }
});

cancelJoinBtn.addEventListener("click", () => {
  joinRoomModal.classList.add("hidden");
});
