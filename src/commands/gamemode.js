module.exports = {
  prefix: "gamemode",
  permissionLevel: "user",
  description: "Gets the current game mode",
  run: (message, requestServerData) =>
    requestServerData(module.exports.prefix, (gamemode) =>
      message.reply(`Current game mode: \`${gamemode}\``, {
        reply: message.author,
      })
    ),
};
