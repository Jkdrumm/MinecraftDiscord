import { Message } from "discord.js";
import Edition from "../../../model/Edition";
import Permission from "../../../model/Permission";
import Command from "../command";

export default class Session extends Command {
  prefix = "session";
  permission = Permission.user;
  description = "Gets the current session ID";
  edition = Edition.bedrock;
  run = (message: Message, requestServerData: any) =>
    requestServerData(this.prefix, (session: string) =>
      message.reply(`Current session ID: \`${session}\``)
    );
}
