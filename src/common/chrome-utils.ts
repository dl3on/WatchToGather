export function sendChromeMsg(msg: any) {
  chrome.runtime.sendMessage(msg);
}

/** Send messages to content script */
export async function sendTabMsg(tabId: number, msg: any) {
  const validTabId = await validateControlledTabId(tabId);
  if (validTabId) chrome.tabs.sendMessage(validTabId, msg);
}

export async function validateControlledTabId(
  tabId: number
): Promise<number | null> {
  if (tabId == null) return null;

  try {
    await chrome.tabs.get(tabId);
    return tabId;
  } catch {
    return null;
  }
}
