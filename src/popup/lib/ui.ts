import { clearRoomDetails } from "./chrome";

const roomIdContainer = document.getElementById(
  "roomIdContainer"
) as HTMLDivElement;
const roomIdTextElement = document.getElementById(
  "roomIdText"
) as HTMLParagraphElement;
const mainView = document.getElementById("mainView") as HTMLDivElement;
const createRoomModal = document.getElementById(
  "createRoomModal"
) as HTMLDivElement;
const joinRoomModal = document.getElementById(
  "joinRoomModal"
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
    "createRoomBtn"
  ) as HTMLButtonElement;
  const joinRoomBtn = document.getElementById(
    "joinRoomBtn"
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
  isHost: boolean
) {
  roomIdTextElement.textContent = `Room ID: ${roomId}`;
  roomIdContainer.classList.remove("hidden");
  mainView.innerHTML = `
    <div class="room-header">
      <p><strong>${roomName}</strong></p>
      <span class="room-participants">${participantsCount} (i)</span>
    </div>
    <div id="room-actions">
      ${
        isHost
          ? `
        <button id="disbandRoomBtn">Disband Room</button>
        <button id="leaveRoomBtn">Leave Room</button>
        `
          : `
        <button id="leaveRoomBtn">Leave Room</button>
      `
      }
    </div>
  `;

  const copyRoomIdBtn = document.getElementById(
    "copyRoomIdBtn"
  ) as HTMLButtonElement;
  const copyFeedback = document.getElementById(
    "copyFeedback"
  ) as HTMLSpanElement;
  const disbandRoomBtn = document.getElementById(
    "disbandRoomBtn"
  ) as HTMLButtonElement;
  const leaveRoomBtn = document.getElementById(
    "leaveRoomBtn"
  ) as HTMLButtonElement;

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

  if (disbandRoomBtn) {
    disbandRoomBtn.addEventListener("click", () => {
      console.log("Disbanding room...");
      // TODO: handle disband room logic
      // emit disband event and disconnects everyone (optionally show disbanded message)

      renderInitialView();
    });
  }

  if (leaveRoomBtn) {
    leaveRoomBtn.addEventListener("click", () => {
      console.log("Leaving room...");
      // TODO: handle leaving room + change host logic
      if (isHost) {
        // reassign host: emit event to socket.ts and update new host's UI
      }
      // emit disconnect event

      renderInitialView();
    });
  }
}

// TODO: function to dynamically update participants count
