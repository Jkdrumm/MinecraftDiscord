import Permission from "../../../model/Permission";
import MinecraftCommand from "../minecraftCommand";

export default class Say extends MinecraftCommand {
  prefix = "say";
  description = "Sends a message in the chat";
  permission = Permission.user;
}
