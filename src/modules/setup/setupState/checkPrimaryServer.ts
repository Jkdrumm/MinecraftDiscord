import SetupState from "./setupState";
import CheckMinecraftEdition from "./checkMinecraftEdition";
import {
  BotProperties,
  properties,
  propertiesPath,
} from "../../settings/properties";

export default class CheckPrimaryServer extends SetupState {
  description: string = "Fetching the primary Discord server";

  next = async () => {
    const serverID = properties?.getRaw("discord.server")?.toString();
    if (serverID) {
      BotProperties.serverID = serverID;
      BotProperties.primaryServer = this.bot.client.guilds.cache.get(serverID);
      return new CheckMinecraftEdition();
    } else {
      this.bot.client.on("guildCreate", () => {
        this.continueServerSetup(true);
      });
      this.bot.client.on("messageCreate", this.handleMessage);
      return await this.continueServerSetup(true);
    }
  };

  continueServerSetup = async (sayHello = false) => {
    let message = "";
    if (sayHello)
      message += `Hello ${BotProperties.owner?.username}. To finish setting up, let's determine what Discord server I should work with. At the moment, I can only work with one server at a time.\n`;
    if (this.bot.client.guilds.cache.size === 0) {
      message += `It appears that I have't been added to any Discord servers yet. Try adding me to a server by using this link: ${BotProperties.inviteLink}`;
    } else {
      message += "I am in the following Discord servers:```";
      let index = 1;
      for (const server of Array.from(this.bot.client.guilds.cache.values())) {
        let name = server.name;
        while (name === undefined)
          name = (await this.bot.client.guilds.fetch(server.id)).name;
        message += `\n${index++}. ${name}`;
      }
      message += `\n${index}. Add to a different server`;
      message += "```";
      message +=
        "Which Discord server would you like me to make my primary Discord server?";
      message +=
        "\nReply with the number next to the server that should be my primary server";
    }
    try {
      await BotProperties.owner?.send(message);
    } catch (e) {
      console.log(
        "I can't DM you on discord unless we are in a mutual server. Please use the following link to add me to a server."
      );
      console.log(BotProperties.inviteLink);
    }
    this.createPromise();
    return this.responsePromise;
  };

  messageOptions = async (message: string) => {
    const selection = parseInt(message);
    if (
      isNaN(selection) ||
      selection <= 0 ||
      selection > this.bot.client.guilds.cache.size + 1
    ) {
      BotProperties.owner?.send(
        "Invalid selection. Please select an option from the list above."
      );
    } else {
      if (selection === this.bot.client.guilds.cache.size + 1)
        BotProperties.owner?.send(
          `Use this link to invite me to a server: ${BotProperties.inviteLink}`
        );
      else {
        const defaultServer = Array.from(this.bot.client.guilds.cache.values())[
          selection - 1
        ];
        this.cleanupListeners();
        BotProperties.owner?.send(
          `Setting '${defaultServer.name}' as my primary Discord server.`
        );
        properties?.set("discord.server", defaultServer.id);
        BotProperties.serverID = defaultServer.id;
        BotProperties.primaryServer = defaultServer;
        await properties?.save(propertiesPath);
        this.responseResolver?.(new CheckMinecraftEdition());
      }
    }
  };
}
