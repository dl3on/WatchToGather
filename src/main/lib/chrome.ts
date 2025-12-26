import { sendChromeMsg } from "../../common/chrome-utils";
import { LocalVideoEvent } from "../../common/sync-messages-types";

/** Content Script -> Offscreen */
export function sendVCMsg(msg: LocalVideoEvent) {
  sendChromeMsg(msg);
}

/** VideoController instantiation status */
export function sendVCStatusMsg(success: boolean) {
  sendChromeMsg({ type: "VC_STATUS", success: success });
}
