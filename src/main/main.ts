import { VideoController } from "./controllers/video-controller";
import { MessageManager } from "../p2p/lib/message-manager";

const video = document.querySelector("video");
if (!video) {
  console.error("No video element found");
} else {
  const videoController = new VideoController(video);
  // TODO: obtain rtc data channels of fellow peers
  const messageManager = new MessageManager("abc", []);
}
