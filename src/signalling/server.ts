import { httpServer, app, connections } from "./socket";

const port = 6767;

type Connection = {
  hostname: string;
  ip: string;
  action: "host" | "joining";
};

app.get("/connections", (req, res) => {
  res.send(connections);
});

httpServer.listen(port, () => {
  console.log(`Server now listening on port ${port}.`);
});
