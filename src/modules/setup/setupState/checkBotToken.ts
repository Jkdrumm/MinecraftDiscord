import SetupState from "./setupState";
import GetApplicationInformation from "./getApplicationInformation";
import readline from "readline";
import {
  properties,
  propertiesPath,
  BotProperties,
} from "../../settings/properties";
import BotStatus from "../../../model/BotStatus";

export default class CheckBotToken extends SetupState {
  description: string = "Connecting to Discord";
  rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  next = async () => {
    const botToken = properties?.getRaw("bot.token")?.toString();
    if (botToken) {
      try {
        await this.bot.login(botToken);
        this.afterLogin();
        BotProperties.botToken = botToken;
        this.rl.close();
        return new GetApplicationInformation();
      } catch (error: any) {
        if (error.message === "An invalid token was provided.") {
          properties?.set("bot.token", "");
          BotProperties.botToken = undefined;
          await properties?.save(propertiesPath);
        } else {
          console.log("ERROR: Unable to connect to the Discord API");
          this.rl.close();
        }
        return Promise.reject(error);
      }
    }
    this.responsePromise = new Promise<SetupState | undefined>(
      (resolve, reject) => {
        this.responseResolver = resolve;
        this.responseRejector = reject;
        this.rl.question("Enter your discord bot token: ", async (token) => {
          try {
            await this.bot.login(token);
            this.afterLogin();
            properties?.set("bot.token", token);
            await properties?.save(propertiesPath);
            BotProperties.botToken = token;
            this.rl.close();
            resolve(new GetApplicationInformation());
          } catch (error: any) {
            if (error.message === "An invalid token was provided.")
              console.log("ERROR: The bot token you entered is invalid");
            else console.log("ERROR: Unable to connect to the Discord API");
            this.rl.close();
            reject(error);
          }
        });
      }
    );
    return this.responsePromise;
  };

  afterLogin = () =>
    this.bot.client?.user?.setPresence({
      status: "dnd",
      activities: [{ name: BotStatus.OFFLINE }],
    });
}
