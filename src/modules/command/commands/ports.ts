import { Message } from "discord.js";
import Permission from "../../../model/Permission";
import Command from "../command";

export default class Ports extends Command {
  prefix = "ports";
  permission = Permission.user;
  description = "Gets the server's ports";
  run = (message: Message, requestServerData: any) =>
    requestServerData(
      this.prefix,
      ({ ipv4, ipv6 }: { ipv4: string; ipv6: string }) =>
        message.reply(
          `Server Ports\n\`\`\`IPv4: ${ipv4}${
            ipv6 ? `\nIPv6: ${ipv6}` : ""
          }\`\`\``
        )
    );
}
