export function sendChromeMsg(msg: any) {
  chrome.runtime.sendMessage(msg);
}

export function sendChromeMsgWithRespone(msg: any): Promise<any> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(msg, (response) => {
      if (chrome.runtime.lastError) {
        console.warn(
          "[sendChromeMsgWithResponse] failed:",
          chrome.runtime.lastError.message,
          msg
        );
        reject(chrome.runtime.lastError);
        return;
      }

      resolve(response);
    });
  });
}

/** Send messages to content script */
export async function sendTabMsg(tabId: number, msg: any, frameId?: number) {
  const validTabId = await validateControlledTabId(tabId);
  if (!validTabId) return;

  const options = frameId ? { frameId } : undefined;

  try {
    await chrome.tabs.sendMessage(validTabId, msg, options);
  } catch (error) {
    console.warn("[sendTabMsg] dropped:", error, {
      tabId: validTabId,
      frameId,
      msg,
    });
  }
}

export async function validateControlledTabId(
  tabId: number | null
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
