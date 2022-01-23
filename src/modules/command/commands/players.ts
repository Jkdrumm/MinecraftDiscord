import { Message } from "discord.js";
import Permission from "../../../model/Permission";
import { BotProperties } from "../../settings/properties";
import Command from "../command";

export default class Players extends Command {
  prefix = "players";
  permission = Permission.user;
  description = "Gets a list of the players currently online";
  run = (message: Message) => {
    const numPlayers = Object.keys(BotProperties.players).length;
    const onlyOnePlayer = numPlayers === 1;
    let reply = `There ${
      onlyOnePlayer ? "is" : "are"
    } currently ${numPlayers} player${onlyOnePlayer ? "" : "s"} online`;
    if (numPlayers !== 0) {
      reply += "\n```";
      const usernameMaxLength = 16;
      Object.keys(BotProperties.players).forEach((id, index) => {
        const username = BotProperties.players[id];
        reply += `${index + 1}. ${username}${" ".repeat(
          usernameMaxLength - username.length
        )} : ${id}\n`;
      });
      reply += "```";
    }
    message.reply(reply);
  };
}
