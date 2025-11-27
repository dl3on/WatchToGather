export function sendChromeMsg(msg: any) {
  chrome.runtime.sendMessage(msg);
}
