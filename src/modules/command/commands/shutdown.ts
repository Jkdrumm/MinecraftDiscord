import Command from "../command";

export default class Shutdown extends Command {
  prefix = "shutdown";
  description =
    "Shut's down the Minecraft server and the Discord bot (use carefully!)";
  run = () => {};
}
