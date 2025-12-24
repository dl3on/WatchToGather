import { LocalVideoEvent } from "../../common/sync-messages-types";

function sendChromeMsg(msg: any) {
  chrome.runtime.sendMessage(msg);
}

/** Content Script -> Offscreen */
export function sendVCMsg(msg: LocalVideoEvent) {
  sendChromeMsg(msg);
}

/** VideoController instantiation status */
export function sendVCStatusMsg(success: boolean) {
  sendChromeMsg({ type: "VC_STATUS", success: success });
}
