import { httpServer, app } from "./socket";

const port = 6767;

type Connection = {
  hostname: string;
  ip: string;
  action: "host" | "joining";
};

const connections: { [roomId: string]: Connection[] } = {};

connections["329rfh398"] = [
  { hostname: "test.io", ip: "0.0.0.0", action: "host" },
];

app.get("/connections", (req, res) => {
  res.send(connections);
});

httpServer.listen(port, () => {
  console.log(`Server now listening on port ${port}.`);
});
