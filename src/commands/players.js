module.exports = {
  prefix: "players",
  permissionLevel: "user",
  description: "Gets a list of the players currently online",
  run: (message, requestServerData) =>
    requestServerData(module.exports.prefix, (players) => {
      let reply = `There are currently ${players.length} players online`;
      if (players.length !== 0) {
        reply += "\n```";
        const usernameMaxLength = 16;
        players.forEach(
          ({ username, xuid }, index) =>
            (reply += `${index + 1}. ${username}${" ".repeat(
              usernameMaxLength - username.length
            )} : ${xuid}\n`)
        );
        reply += "```";
      }
      message.reply(reply, { reply: message.author });
    }),
};
