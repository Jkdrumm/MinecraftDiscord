import { Message } from "discord.js";
import Permission from "../../../model/Permission";
import Command from "../command";

export default class Level extends Command {
  prefix = "level";
  permission = Permission.user;
  description = "Gets the current level name";
  run = (message: Message, requestServerData: any) =>
    requestServerData(this.prefix, (level: string) =>
      message.reply(`Current level: \`${level}\``)
    );
}
