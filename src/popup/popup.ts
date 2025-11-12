const createRoomBtn = document.getElementById(
  "createRoomBtn"
) as HTMLButtonElement;
const modal = document.getElementById("modal") as HTMLDivElement;
const cancelBtn = document.getElementById("cancel") as HTMLButtonElement;
const confirmCreateBtn = document.getElementById(
  "confirmCreate"
) as HTMLButtonElement;
const roomTitleInput = document.getElementById("roomTitle") as HTMLInputElement;
const webpageLinkInput = document.getElementById(
  "webpageLink"
) as HTMLInputElement;

// Event listeners
createRoomBtn.addEventListener("click", () => {
  modal.classList.remove("hidden");
});

cancelBtn.addEventListener("click", () => {
  modal.classList.add("hidden");
});

confirmCreateBtn.addEventListener("click", () => {
  const roomTitle = roomTitleInput.value.trim();
  const webpageLink = webpageLinkInput.value.trim();

  if (roomTitle !== "" && webpageLink !== "") {
    console.log("Room created:", roomTitle);
    // TODO: trigger background script or signaling setup here

    modal.classList.add("hidden");

    // TODO: Remove create room button and show disband room button & room members count
  } else {
    console.log("Fill in the details!");
  }
});
