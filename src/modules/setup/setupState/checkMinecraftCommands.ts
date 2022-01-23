import SetupState from "./setupState";
import MinecraftCommands, {
  loadMinecraftCommands,
} from "../../command/minecraftCommands";
import { properties, propertiesPath } from "../../settings/properties";
import CheckEULA from "./checkEULA";
import Permission from "../../../model/Permission";

export default class CheckMinecraftCommands extends SetupState {
  description: string = "Loading Minecraft commands";

  next = async () => {
    loadMinecraftCommands();
    const loadedCommands: string[] = [];
    properties?.each((key, value) => {
      if (key.startsWith("command.")) {
        const command = key.substring(8);
        MinecraftCommands[command].permission = value as Permission;
        loadedCommands.push(command);
      }
    });
    let requiresSave = false;
    Object.entries(MinecraftCommands).forEach(([key, value]) => {
      if (!loadedCommands.includes(key)) {
        properties?.set(`command.${key}`, value.permission);
        requiresSave = true;
      }
    });
    if (requiresSave) properties?.save(propertiesPath);
    return new CheckEULA();
  };
}
