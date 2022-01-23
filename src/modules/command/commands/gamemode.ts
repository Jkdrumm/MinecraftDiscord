import { Message } from "discord.js";
import Permission from "../../../model/Permission";
import Command from "../command";

export default class Gamemode extends Command {
  prefix = "gamemode";
  permission = Permission.user;
  description = "Gets the current game mode";
  run = (message: Message, requestServerData: any) =>
    requestServerData(this.prefix, (gamemode: string) =>
      message.reply(`Current game mode: \`${gamemode}\``)
    );
}
