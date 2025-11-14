const mainView = document.getElementById("mainView") as HTMLDivElement;
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
const roomTitleInput = document.getElementById("roomTitle") as HTMLInputElement;
const webpageLinkInput = document.getElementById(
  "webpageLink"
) as HTMLInputElement;
const roomIdInput = document.getElementById("roomId") as HTMLInputElement;

// Check for existing room
const roomData = localStorage.getItem("roomDetails");

if (roomData) {
  const { roomTitle, participantsCount, host } = JSON.parse(roomData);
  updateUIForRoom(roomTitle, participantsCount, host);
} else {
  renderInitialView();
}

function renderInitialView() {
  // Clear local save
  localStorage.clear();
  console.log("Cleared room details");

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

// Create Room
confirmCreateBtn.addEventListener("click", () => {
  const roomTitle = roomTitleInput.value.trim();
  const webpageLink = webpageLinkInput.value.trim();

  if (roomTitle !== "" && webpageLink !== "") {
    console.log("Room created:", roomTitle);
    // TODO: trigger background script or signaling setup here

    createRoomModal.classList.add("hidden");

    // TODO: Get roomId
    // Save room details
    localStorage.setItem(
      "roomDetails",
      JSON.stringify({
        roomTitle: roomTitle,
        participantsCount: 1,
        host: true,
      })
    );
    console.log("Saved room details");
    updateUIForRoom(roomTitle, 1, true);
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
    chrome.runtime.sendMessage({
      type: "ROOM_ID",
      roomId: roomId,
    });
    // TODO: trigger background script or signaling setup here

    joinRoomModal.classList.add("hidden");

    // TODO: obtain room name, roomId, and number of participants
    const roomName = "roomTitle";
    const participants = 2;
    const isHost = false;

    // Save room details
    localStorage.setItem(
      "roomDetails",
      JSON.stringify({
        roomTitle: roomName,
        participantsCount: participants,
        host: isHost,
      })
    );
    console.log("Saved room details");
    updateUIForRoom(roomName, participants, isHost);
  } else {
    console.log("Room ID required!");
  }
});

cancelJoinBtn.addEventListener("click", () => {
  joinRoomModal.classList.add("hidden");
});

function updateUIForRoom(
  roomName: string,
  participants: number,
  isHost: boolean
) {
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

  // Add event listeners
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
