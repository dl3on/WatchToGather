import { httpServer, app, connections } from "./socket";

const port = 6767;
app.get("/connections", (req, res) => {
  res.send(connections);
});

httpServer.listen(port, () => {
  console.log(`Server now listening on port ${port}.`);
});
