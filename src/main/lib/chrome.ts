import { LocalVideoEvent, VCReadyMsg } from "../../common/sync-messages-types";

function sendChromeMsg(msg: any) {
  chrome.runtime.sendMessage(msg);
}

export function sendVCMsg(msg: LocalVideoEvent) {
  sendChromeMsg(msg);
}

/** Notify background.js */
export function sendVCReadyMsg(msg: VCReadyMsg) {
  sendChromeMsg(msg);
}
