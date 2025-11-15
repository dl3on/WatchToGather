import { httpServer, app, connections } from "./socket.js";

const port = 80;
app.get("/connections", (req, res) => {
  res.send(connections);
});

httpServer.listen(port, () => {
  console.log(`Server now listening on port ${port}.`);
});
