function sendChromeMsg(msg: any) {
  chrome.identity.getProfileUserInfo().then((res) => {
    const toSend = { ...res, ...msg };
    chrome.runtime.sendMessage(toSend);
  });
}

export function sendJoinMsg(roomId: string) {
  sendChromeMsg({ type: "JOIN", roomId });
}

export function sendHostMsg() {
  sendChromeMsg({ type: "HOST" });
}
