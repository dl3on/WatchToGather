import { LocalVideoEvent } from "../../common/sync-messages-types";

function sendChromeMsg(msg: any) {
  chrome.runtime.sendMessage(msg);
}

export function sendVCMsg(msg: LocalVideoEvent) {
  sendChromeMsg(msg);
}

// export function sendReadyMsg(msg) {}
