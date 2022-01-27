import SetupState from "./setupState";
import {
  BotProperties,
  properties,
  propertiesPath,
  ServerProperties,
} from "../../settings/properties";
import CheckDownloadedServerVersion from "./checkDownloadedServerVersion";
import CheckJavaVersion from "./checkJavaVersion";

export default class CheckMinecraftEdition extends SetupState {
  description: string = "Checking the Minecraft edition";

  next = async () => {
    const isJavaEdition = properties?.get("minecraft.isJavaEdition");
    if (isJavaEdition !== null) {
      ServerProperties.isJavaEdition = isJavaEdition as boolean;
      if (isJavaEdition) return new CheckJavaVersion();
      return new CheckDownloadedServerVersion();
    } else {
      let content =
        "What edition of Minecraft would you like to run? React accordingly to make your selection.";
      content += "```";
      content += "1. Java Edition (PC Exclusive - most common)\n";
      content += "2. Bedrock Edition (PC and console cross-play)";
      content += "```";
      this.reactionMessage = await BotProperties.owner?.send(content);
      this.createPromise();
      this.bot.client.addListener("messageReactionAdd", this.handleReaction);
      this.reactionMessage?.react("1️⃣");
      this.reactionMessage?.react("2️⃣");
      return this.responsePromise;
    }
  };

  reactionOptions = async (emoji: string) => {
    switch (emoji) {
      case "1️⃣":
        ServerProperties.isJavaEdition = true;
        break;
      case "2️⃣":
        ServerProperties.isJavaEdition = false;
        break;
    }
    if (ServerProperties.isJavaEdition !== null) {
      this.cleanupListeners();
      BotProperties.owner?.send(
        `Initializing a ${
          ServerProperties.isJavaEdition ? "Java" : "Bedrock"
        } edition server.`
      );
      properties?.set(
        "minecraft.isJavaEdition",
        ServerProperties.isJavaEdition
      );
      await properties?.save(propertiesPath);
      if (ServerProperties.isJavaEdition)
        this.responseResolver?.(new CheckJavaVersion());
      else this.responseResolver?.(new CheckDownloadedServerVersion());
    }
  };
}
