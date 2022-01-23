import { ServerProperties } from "../settings/properties";
import MinecraftCommand from "./minecraftCommand";
import Edition from "../../model/Edition";

// Can't dynamically import due to pkg, so we'll manually import every command
import Ban from "./minecraftCommands/ban";
import Gamerule from "./minecraftCommands/gamerule";
import Kick from "./minecraftCommands/kick";
import Say from "./minecraftCommands/say";
import SetWorldSpawn from "./minecraftCommands/setworldspawn";

const importedCommands = [Ban, Gamerule, Kick, Say, SetWorldSpawn];

let MinecraftCommands: { [key: string]: MinecraftCommand } = {};
export const loadMinecraftCommands = () =>
  importedCommands.forEach((Command) => {
    const command: MinecraftCommand = new Command();
    if (
      command.edition === Edition.both ||
      (command.edition === Edition.java) === ServerProperties.isJavaEdition
    )
      MinecraftCommands[command.prefix.toLowerCase()] = command;
  });

export default MinecraftCommands;
