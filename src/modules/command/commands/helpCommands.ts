import { Message } from "discord.js";
import Permission from "../../../model/Permission";
import { BotProperties } from "../../settings/properties";
import Command from "../command";
import MinecraftCommands from "../minecraftCommands";

export default class HelpCommands extends Command {
  prefix = "helpCommands";
  permission = Permission.user;
  description = "Displays a full list of Minecraft commands that can be ran";
  run = (message: Message) => {
    let reply =
      "Here is a full list of minecraft server commands that you have access to:\n```";
    for (const [, command] of Object.entries(MinecraftCommands))
      if (
        message.author.id === BotProperties.owner?.id ||
        command.permission === Permission.user
      )
        reply += `\n!${command.prefix}${" ".repeat(
          16 - command.prefix.length
        )} : ${command.description}`;
    reply += "\n```";
    message.reply(reply);
  };
}
