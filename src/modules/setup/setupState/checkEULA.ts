import SetupState from "./setupState";
import { ServerProperties, BotProperties } from "../../settings/properties";
import CheckForWorld from "./checkForWorld";
import fs from "fs";

export default class CheckEULA extends SetupState {
  description: string = "Checking for EULA agreement";
  eulaFile: string = `${process.cwd()}/java/${
    ServerProperties.version
  }/eula.txt`;

  next = async () => {
    if (ServerProperties.isJavaEdition) {
      let eulaValue = undefined;
      if (fs.existsSync(this.eulaFile)) {
        fs.readFileSync(this.eulaFile, "utf-8")
          .split("\n")
          .every((line) => {
            if (line.startsWith("eula=")) {
              eulaValue = line.substring(5).toLowerCase().trim() === "true";
              return false;
            }
            return true;
          });
        if (eulaValue) return new CheckForWorld();
      }
      const content =
        "Please react with ✅ if you agree to Minecraft's EULA: https://account.mojang.com/documents/minecraft_eula";
      this.reactionMessage = await BotProperties.owner?.send(content);
      this.createPromise();
      this.bot.client.addListener("messageReactionAdd", this.handleReaction);
      this.reactionMessage?.react("✅");
      return this.responsePromise;
    } else return new CheckForWorld();
  };

  reactionOptions = async (emoji: string) => {
    if (emoji === "✅") {
      this.cleanupListeners();
      const eulaAgreement = "eula=true\n";
      let foundEulaLine = false;
      let totalFile = "";
      if (fs.existsSync(this.eulaFile)) {
        fs.readFileSync(this.eulaFile, "utf-8")
          .split("\n")
          .forEach((line) => {
            if (line.startsWith("eula=")) {
              foundEulaLine = true;
              totalFile += eulaAgreement;
            } else if (line.trim().length) totalFile += `${line}\n`;
          });
      }
      if (!foundEulaLine) totalFile += eulaAgreement;
      fs.writeFileSync(this.eulaFile, totalFile);
      this.responseResolver?.(new CheckForWorld());
    }
  };
}
