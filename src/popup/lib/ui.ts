import { clearRoomDetails } from "./chrome";

const roomIdElement = document.getElementById("roomId") as HTMLParagraphElement;
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

  roomIdElement.textContent = "";
  roomIdElement.classList.add("hidden");
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
  participants: number,
  isHost: boolean
) {
  roomIdElement.textContent = `Room ID: ${roomId}`;
  roomIdElement.classList.remove("hidden");
  mainView.innerHTML = `
    <div class="room-header">
      <p><strong>${roomName}</strong></p>
      <span class="room-participants">${participants} (i)</span>
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

  const disbandRoomBtn = document.getElementById(
    "disbandRoomBtn"
  ) as HTMLButtonElement;
  const leaveRoomBtn = document.getElementById(
    "leaveRoomBtn"
  ) as HTMLButtonElement;

  if (disbandRoomBtn) {
    disbandRoomBtn.addEventListener("click", () => {
      console.log("Disbanding room...");
      // TODO: handle disband room logic

      renderInitialView();
    });
  }

  if (leaveRoomBtn) {
    leaveRoomBtn.addEventListener("click", () => {
      console.log("Leaving room...");
      // TODO: handle leaving room + change host logic

      renderInitialView();
    });
  }
}

// TODO: function to dynamically update participants count
