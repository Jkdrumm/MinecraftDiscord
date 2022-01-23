"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var BotStatus;
(function (BotStatus) {
    BotStatus["ONLINE"] = "Minecraft";
    BotStatus["OFFLINE"] = "Server is Offline";
    BotStatus["RESTARTING"] = "Server is Restarting...";
    BotStatus["HOSTNAME_PORT_ERROR"] = "ERROR: Check Port Forwarding or DNS Configuration";
})(BotStatus || (BotStatus = {}));
exports.default = BotStatus;
