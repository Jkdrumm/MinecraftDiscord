import Permission from "../../model/Permission";
import Edition from "../../model/Edition";

export default abstract class MinecraftCommand {
  abstract prefix: string;
  abstract description: string;
  permission: Permission = Permission.owner;
  edition: Edition = Edition.both;
}
