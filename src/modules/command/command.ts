import { Message } from "discord.js";
import Edition from "../../model/Edition";
import Permission from "../../model/Permission";
import MinecraftCommand from "./minecraftCommand";

export default abstract class Command extends MinecraftCommand {
  permission = Permission.owner;
  edition = Edition.both;
  abstract run: (message: Message, requestServerData?: any) => void;
}
