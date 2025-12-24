import { RoomDetails, RoomUrl } from "./types";

export function saveRoomDetails(roomDetails: RoomDetails) {
  chrome.storage.local.set({ roomDetails });
}

export function loadRoomDetails(): Promise<RoomDetails | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get("roomDetails", (res) => {
      resolve(res.roomDetails ?? null);
    });
  });
}

export function clearRoomDetails() {
  chrome.storage.local.remove("roomDetails");
}

export function saveRoomUrl(url: string) {
  chrome.storage.local.set({ roomUrl: { url } });
}

export function loadRoomUrl(): Promise<RoomUrl | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get("roomUrl", (res) => {
      resolve(res.roomUrl ?? null);
    });
  });
}

export function saveVCStates(
  controlledTabId: number | null,
  isInRoom: boolean
) {
  chrome.storage.local.set({ controlledTabId, isInRoom });
}

export function loadVCStates(): Promise<{
  controlledTabId: number | null;
  isInRoom: boolean;
}> {
  return new Promise((resolve) => {
    chrome.storage.local.get(["controlledTabId", "isInRoom"], (res) => {
      resolve({
        controlledTabId: res.controlledTabId ?? null,
        isInRoom: !!res.isInRoom,
      });
    });
  });
}

// TODO: clear other storages
