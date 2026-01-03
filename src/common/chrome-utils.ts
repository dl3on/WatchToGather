export function sendChromeMsg(msg: any) {
  chrome.runtime.sendMessage(msg);
}

export function sendChromeMsgWithRespone(msg: any): Promise<any> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(msg, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
}

/** Send messages to content script */
export async function sendTabMsg(tabId: number, msg: any, frameId?: number) {
  const validTabId = await validateControlledTabId(tabId);
  const options = frameId ? { frameId } : undefined;
  if (validTabId) chrome.tabs.sendMessage(validTabId, msg, options);
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
