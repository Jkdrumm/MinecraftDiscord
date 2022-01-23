import onExit from "signal-exit";
import Log from "./src/modules/log/log";
import setup from "./src/modules/setup/setup";
import Bot from "./src/modules/discord/bot";

const logger = Log.getLog();

const logError = (error: any) => {
  if (!error) logger.logError("Unknown Error");
  else if (error.stack) logger.logError(error.stack.substring(7));
  else logger.logError(error.substring(7));
};

process.on("uncaughtException", (error: any) => logError(error));
process.on("unhandledRejection", (error: any) => logError(error));

setup();
onExit(() => Bot.getBot().client.user?.setPresence({ status: "invisible" }));
