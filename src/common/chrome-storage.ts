import { NavStates, PeerReadinessMap } from "./sync-messages-types";
import { RoomDetails, RoomUrl } from "./types";

const STORAGE_KEY_HEADER = "watchtogather";

function getKey<T>(key: string): Promise<T | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, (res) => resolve(res[key] ?? null));
  });
}

function saveKey<T>(key: string, value: T) {
  chrome.storage.local.set({ [key]: value });
}

export function getPeerId(): Promise<string> {
  return new Promise((resolve) => {
    chrome.storage.local.get(`${STORAGE_KEY_HEADER}_peerId`, (res) => {
      if (res[`${STORAGE_KEY_HEADER}_peerId`]) {
        resolve(res[`${STORAGE_KEY_HEADER}_peerId`]);
        return;
      }

      const peerId = crypto.randomUUID();
      chrome.storage.local.set(
        { [`${STORAGE_KEY_HEADER}_peerId`]: peerId },
        () => {
          resolve(peerId);
        },
      );
    });
  });
}

export function saveRoomDetails(roomDetails: RoomDetails) {
  saveKey<RoomDetails>(`${STORAGE_KEY_HEADER}_roomDetails`, roomDetails);
}

export function loadRoomDetails(): Promise<RoomDetails | null> {
  return getKey<RoomDetails>(`${STORAGE_KEY_HEADER}_roomDetails`);
}

export function clearRoomDetails() {
  chrome.storage.local.remove(`${STORAGE_KEY_HEADER}_roomDetails`);
}

export function saveParticipantsCount(participantsCount: number) {
  saveKey<number>(`${STORAGE_KEY_HEADER}_participantsCount`, participantsCount);
}

export function getParticipantsCount(): Promise<number | null> {
  return getKey<number>(`${STORAGE_KEY_HEADER}_participantsCount`);
}

export function saveRoomUrl(url: string) {
  saveKey<RoomUrl>(`${STORAGE_KEY_HEADER}_roomUrl`, { url });
}

export function loadRoomUrl(): Promise<RoomUrl | null> {
  return getKey<RoomUrl>(`${STORAGE_KEY_HEADER}_roomUrl`);
}

export function saveControlledTabId(controlledTabId: number | null) {
  saveKey<number | null>(
    `${STORAGE_KEY_HEADER}_controlledTabId`,
    controlledTabId,
  );
}

export function getControlledTabId(): Promise<number | null> {
  return getKey<number | null>(`${STORAGE_KEY_HEADER}_controlledTabId`);
}

export function saveIsInRoom(isInRoom: boolean) {
  saveKey<boolean>(`${STORAGE_KEY_HEADER}_isInRoom`, isInRoom);
}

export async function checkInRoom(): Promise<boolean> {
  return !!(await getKey<boolean>(`${STORAGE_KEY_HEADER}_isInRoom`));
}

export function saveReadinessMap(peerReadinessMap: PeerReadinessMap) {
  saveKey<PeerReadinessMap>(
    `${STORAGE_KEY_HEADER}_peerReadinessMap`,
    peerReadinessMap,
  );
}

export function loadReadinessMap(): Promise<PeerReadinessMap | null> {
  return getKey<PeerReadinessMap>(`${STORAGE_KEY_HEADER}_peerReadinessMap`);
}

export function saveNavStates(navStates: NavStates) {
  saveKey<NavStates>(`${STORAGE_KEY_HEADER}_navStates`, navStates);
}

export function loadNavStates(): Promise<NavStates | null> {
  return getKey<NavStates>(`${STORAGE_KEY_HEADER}_navStates`);
}

export function clearRoomSessionStorage() {
  chrome.storage.local.remove([
    `${STORAGE_KEY_HEADER}_roomDetails`,
    `${STORAGE_KEY_HEADER}_participantsCount`,
    `${STORAGE_KEY_HEADER}_roomUrl`,
    `${STORAGE_KEY_HEADER}_controlledTabId`,
    `${STORAGE_KEY_HEADER}_isInRoom`,
    `${STORAGE_KEY_HEADER}_peerReadinessMap`,
    `${STORAGE_KEY_HEADER}_navStates`,
  ]);
}
