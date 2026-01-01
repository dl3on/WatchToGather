import {
  sendChromeMsg,
  sendChromeMsgWithRespone,
} from "../../common/chrome-utils";
import { LocalVideoEvent } from "../../common/sync-messages-types";

/** Content Script -> Offscreen */
export function sendVCMsg(msg: LocalVideoEvent) {
  sendChromeMsg(msg);
}

/** VideoController instantiation status */
export function sendVCStatusMsg(success: boolean) {
  sendChromeMsg({ type: "VC_STATUS", success: success });
}

export async function injectIntoIframe(
  iframe: HTMLIFrameElement
): Promise<boolean> {
  try {
    const response = await sendChromeMsgWithRespone({
      type: "INJECT_INTO_IFRAME",
      iframeSrc: iframe.src,
    });

    if (response?.success) {
      console.log(`[VIDEO] Injection successful in frame ${response.frameId}`);
      return true;
    } else {
      console.log(
        `[VIDEO] Injection failed: ${response?.reason || "Unknown error"}`
      );
      return false;
    }
  } catch (err) {
    console.error("[VIDEO] Failed to send injection message:", err);
    return false;
  }
}
