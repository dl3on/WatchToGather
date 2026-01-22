import {
  sendChromeMsg,
  sendChromeMsgWithResponse,
} from "../../common/chrome-utils";
import { LocalVideoEvent } from "../../common/sync-messages-types";

/** Content Script -> Offscreen */
export function sendVCMsg(msg: LocalVideoEvent) {
  sendChromeMsg(msg);
}

/** VideoController instantiation status */
export function sendVCStatusMsg(success: boolean, navId: number) {
  sendChromeMsg({ type: "VC_STATUS", success: success, navId: navId });
}

export async function injectIntoIframe(
  iframe: HTMLIFrameElement,
): Promise<boolean> {
  try {
    const response = await sendChromeMsgWithResponse({
      type: "INJECT_INTO_IFRAME",
      iframeSrc: iframe.src,
    });

    if (response?.success) {
      return true;
    } else {
      console.log(
        `[VIDEO] Injection failed: ${response?.reason || "Unknown error"}`,
      );
      return false;
    }
  } catch (error) {
    console.error("[VIDEO] Failed to send injection message:", error);
    return false;
  }
}

export async function getMyTabId(): Promise<number | undefined> {
  try {
    const response = await sendChromeMsgWithResponse({ type: "GET_MY_TAB_ID" });
    return response?.tabId;
  } catch (error) {
    console.error("[Content Script] Failed to get tab ID:", error);
  }
}
