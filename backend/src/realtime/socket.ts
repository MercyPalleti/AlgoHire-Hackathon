import { Server } from "socket.io";
import { sub } from "./pubsub";

let io: Server;

export const initSocket = (server: any) => {
  io = new Server(server, {
    cors: { origin: "*" },
  });

  io.on("connection", (socket) => {
    console.log("Client connected");

    // client sends zoneId after connect
    socket.on("join_zone", (zoneId) => {
      socket.join(`zone_${zoneId}`);
    });
  });

  // listen to redis events
  sub.subscribe("alerts", (err) => {
    if (err) console.error(err);
  });

  sub.on("message", (channel, message) => {
    const data = JSON.parse(message);

    if (channel === "alerts") {
      // send only to that zone
      io.to(`zone_${data.zone_id}`).emit("alert_update", data);
    }
  });
};