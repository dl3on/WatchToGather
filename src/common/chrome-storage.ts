import { NavStates } from "./sync-messages-types";
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

export function saveControlledTabId(controlledTabId: number | null) {
  chrome.storage.local.set({ controlledTabId });
}

export function getControlledTabId(): Promise<number | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get("controlledTabId", async (res) => {
      resolve(res.controlledTabId ?? null);
    });
  });
}

export function saveIsInRoom(isInRoom: boolean) {
  chrome.storage.local.set({ isInRoom });
}

export function getIsInRoom(): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.storage.local.get("isInRoom", async (res) => {
      resolve(!!res.isInRoom);
    });
  });
}

export function saveReadinessMap(peerReadinessMap: Record<string, boolean>) {
  chrome.storage.local.set({ peerReadinessMap });
}

export function loadReadinessMap(): Promise<Record<string, boolean> | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get("peerReadinessMap", (res) => {
      resolve(res.peerReadinessMap ?? null);
    });
  });
}

export function saveNavStates(navStates: NavStates) {
  chrome.storage.local.set({ navStates });
}

export function loadNavStates(): Promise<NavStates | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get("navStates", (res) => {
      resolve(res.navStates ?? null);
    });
  });
}

// TODO: clear other storages
