import fs from "fs";
import SetupState from "./setupState";
import { BotProperties, ServerProperties } from "../../settings/properties";
import propertiesReader from "properties-reader";
import CheckDomainName from "./checkDomainName";

export default class SetSeed extends SetupState {
  description: string = "Setting the World Seed";

  next = async () => {
    this.createPromise();
    const message =
      "What do you want to set the world seed as?\nReact with ❓ if you want the seed to be randomly generated for you, or respond with a seed of your own.";
    this.reactionMessage = await BotProperties.owner?.send(message);
    this.reactionMessage?.react("❓");
    this.bot.client.addListener("messageReactionAdd", this.handleReaction);
    this.bot.client.on("messageCreate", this.handleMessage);
    return this.responsePromise;
  };

  reactionOptions = async (emoji: string) => {
    if (emoji === "❓") this.saveSeed();
  };

  messageOptions = async (message: string) => this.saveSeed(message);

  saveSeed = (seed?: string) => {
    this.cleanupListeners();
    const serverPath = `${process.cwd()}\\${
      ServerProperties.isJavaEdition ? "java" : "bedrock"
    }\\${ServerProperties.version}`;
    const serverPropertiesPath = `${serverPath}\\server.properties`;
    if (!fs.existsSync(serverPropertiesPath))
      fs.writeFileSync(serverPropertiesPath, "");
    const properties = propertiesReader(serverPropertiesPath, "utf8", {
      saveSections: false,
    });
    properties.set("level-seed", seed ?? "");
    properties.save(serverPropertiesPath);
    this.responseResolver?.(new CheckDomainName());
  };
}
