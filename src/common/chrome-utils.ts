import { LeaveType } from "./types";

export function sendChromeMsg(msg: any) {
  chrome.runtime.sendMessage(msg);
}

export function sendChromeMsgWithResponse(msg: any): Promise<any> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(msg, (response) => {
      if (chrome.runtime.lastError) {
        console.warn(
          "[sendChromeMsgWithResponse] failed:",
          chrome.runtime.lastError.message,
          msg,
        );
        reject(chrome.runtime.lastError);
        return;
      }

      resolve(response);
    });
  });
}

/** Send messages to content script */
export async function sendTabMsg(
  tabId: number,
  msg: any,
  frameId?: number,
): Promise<boolean> {
  const validTabId = await validateControlledTabId(tabId);
  if (!validTabId) return false;

  const options = frameId !== undefined ? { frameId } : undefined;

  try {
    await chrome.tabs.sendMessage(validTabId, msg, options);
    return true;
  } catch (error) {
    console.warn("[sendTabMsg] dropped:", error, {
      tabId: validTabId,
      frameId,
      msg,
    });

    // Content script might not have been injected
    return false;
  }
}

export async function validateControlledTabId(
  tabId: number | null,
): Promise<number | null> {
  if (tabId == null) return null;

  try {
    await chrome.tabs.get(tabId);
    return tabId;
  } catch (error) {
    console.log(`Tab ID ${tabId}: ${error}`);
    return null;
  }
}

export function requestLeaveRoom(reason: LeaveType) {
  sendChromeMsg({ type: "REQUEST_LEAVE", reason });
}

export async function initiateLeaveRoom(): Promise<boolean> {
  const response = await sendChromeMsgWithResponse({
    type: "INITIATE_LEAVE",
  });

  return response?.success;
}
