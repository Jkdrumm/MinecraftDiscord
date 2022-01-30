import SetupState from "./setupState";
import {
  BotProperties,
  properties,
  propertiesPath,
  ServerProperties,
} from "../../settings/properties";
import { v4 } from "what-is-my-ip-address";
import LoadLinkedUsers from "./loadLinkedUsers";
import Log from "../../log/log";

export default class CheckDomainName extends SetupState {
  description: string = "Checking Domain Name";

  next = async () => {
    const domainName = properties?.get("minecraft.domainName") ?? undefined;
    if (domainName !== undefined) {
      if (domainName !== false)
        ServerProperties.domainName = domainName.toString();
      else this.setDomainAsIPAddress();
      return new LoadLinkedUsers();
    } else {
      this.createPromise();
      const content =
        "Are you using a domain name? If so, send me your domain name. If not, react with ⏩";
      this.bot.client.addListener("messageReactionAdd", this.handleReaction);
      this.bot.client.on("messageCreate", this.handleMessage);
      this.reactionMessage = await BotProperties.owner?.send(content);
      this.reactionMessage?.react("⏩");
      return this.responsePromise;
    }
  };

  reactionOptions = async (emoji: string) => {
    if (emoji === "⏩") {
      properties?.set("minecraft.domainName", false);
      await properties?.save(propertiesPath);
      await this.setDomainAsIPAddress();
      this.cleanupListeners();
      this.responseResolver?.(new LoadLinkedUsers());
    }
  };

  messageOptions = async (message: string) => {
    ServerProperties.domainName = message;
    properties?.set("minecraft.domainName", message);
    await properties?.save(propertiesPath);
    this.cleanupListeners();
    this.responseResolver?.(new LoadLinkedUsers());
  };

  setDomainAsIPAddress = async () => {
    try {
      const ip = await v4();
      ServerProperties.domainName = ip;
    } catch (e) {
      Log.getLog().logError(
        "Unable to get IP address, may not be connected to the internet"
      );
      ServerProperties.domainName = false;
    }
  };
}
