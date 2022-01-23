import { Message } from "discord.js";
import Permission from "../../../model/Permission";
import Command from "../command";

export default class Version extends Command {
  prefix = "version";
  permission = Permission.user;
  description = "Gets the current game version";
  run = (message: Message, requestServerData: any) =>
    requestServerData(this.prefix, (version: string) =>
      message.reply(`Current version : \`${version}\``)
    );
}
