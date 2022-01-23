import { Message } from "discord.js";
import Permission from "../../../model/Permission";
import { BotProperties } from "../../settings/properties";
import Command from "../command";
import Commands from "../commands";

export default class Help extends Command {
  prefix = "help";
  permission = Permission.user;
  description = "How you got here";
  run = (message: Message) => {
    let reply = "Here is a full list of commands that you have access to:\n```";
    for (const [, command] of Object.entries(Commands))
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
