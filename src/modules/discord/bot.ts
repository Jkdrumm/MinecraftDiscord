import { Client } from "discord.js";
import Log from "../log/log";
import { BotProperties } from "../settings/properties";

class Bot {
  static bot: Bot;
  client: Client;
  logger: Log;

  static getBot = () => {
    if (Bot.bot === undefined) Bot.bot = new Bot();
    return Bot.bot;
  };

  constructor() {
    this.logger = Log.getLog();
    this.client = new Client({
      partials: ["MESSAGE", "CHANNEL", "REACTION"],
      intents: [
        "GUILDS",
        "GUILD_MESSAGES",
        "GUILD_PRESENCES",
        "GUILD_MEMBERS",
        "DIRECT_MESSAGES",
        "DIRECT_MESSAGE_REACTIONS",
        "GUILD_MESSAGE_REACTIONS",
      ],
    });
    this.client.on("disconnect", () => {
      this.logger.logError("Disconnected from Discord");
      if (BotProperties.botToken) this.client.login(BotProperties.botToken);
    });
    this.client.on("error", (error: any) => this.logger.logError(error.stack));
    this.client.on("reconnecting", (message: any) =>
      this.logger.logInfo(message)
    );
    this.client.on("unhandledRejection", (error: any) =>
      this.logger.logError(error.stack)
    );
    this.client.on("uncaughtException", (error: any) =>
      this.logger.logError(error.stack)
    );
  }

  login(botToken: string) {
    return this.client.login(botToken);
  }
}

export default Bot;
