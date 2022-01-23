import { Message } from "discord.js";
import Edition from "../../../model/Edition";
import Permission from "../../../model/Permission";
import Command from "../command";

export default class Difficulty extends Command {
  prefix = "difficulty";
  permission = Permission.user;
  description = "Gets the current difficulty";
  edition = Edition.bedrock;
  run = (message: Message, requestServerData: any) =>
    requestServerData(this.prefix, (difficulty: string) =>
      message.reply(`Current difficulty: \`${difficulty}\``)
    );
}
