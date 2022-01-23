import SetupState from "./setupState";
import {
  BotProperties,
  properties,
  propertiesPath,
} from "../../settings/properties";
import { networkInterfaces } from "os";
import LoadLinkedUsers from "./loadLinkedUsers";

export default class CheckDomainName extends SetupState {
  description: string = "Checking Domain Name";

  next = async () => {
    const domainName = properties?.get("minecraft.domainName") ?? undefined;
    if (domainName !== undefined) {
      if (domainName !== false)
        BotProperties.domainName = domainName.toString();
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
      this.setDomainAsIPAddress();
      this.cleanupListeners();
      this.responseResolver?.(new LoadLinkedUsers());
    }
  };

  messageOptions = async (message: string) => {
    BotProperties.domainName = message;
    properties?.set("minecraft.domainName", message);
    await properties?.save(propertiesPath);
    this.cleanupListeners();
    this.responseResolver?.(new LoadLinkedUsers());
  };

  setDomainAsIPAddress = () => {
    const networks = networkInterfaces();
    const defaultNetwork = Object.keys(networks).find((network) =>
      network.toLowerCase().includes("default")
    );
    if (defaultNetwork) {
      const ipv4Family = networks[defaultNetwork]?.find(
        ({ family }) => family === "IPv4"
      );
      const ipv4 = ipv4Family?.address;
      BotProperties.domainName = ipv4;
    }
  };
}
