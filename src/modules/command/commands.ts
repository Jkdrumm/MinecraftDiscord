import { ServerProperties } from "../settings/properties";
import Command from "./command";
import Edition from "../../model/Edition";

// Can't dynamically import due to pkg, so we'll manually import every command
import Difficulty from "./commands/difficulty";
import Gamemode from "./commands/gamemode";
import Help from "./commands/help";
import HelpCommands from "./commands/helpCommands";
import Level from "./commands/level";
import Players from "./commands/players";
import Ports from "./commands/ports";
import Session from "./commands/session";
import Shutdown from "./commands/shutdown";
import Version from "./commands/version";

const importedCommands = [
  Difficulty,
  Gamemode,
  Help,
  HelpCommands,
  Level,
  Players,
  Ports,
  Session,
  Shutdown,
  Version,
];

const Commands: { [key: string]: Command } = {};
export const loadCommands = () =>
  importedCommands.forEach((Command) => {
    const command: Command = new Command();
    if (
      command.edition === Edition.both ||
      (command.edition === Edition.java) === ServerProperties.isJavaEdition
    )
      Commands[command.prefix.toLowerCase()] = command;
  });
export default Commands;
