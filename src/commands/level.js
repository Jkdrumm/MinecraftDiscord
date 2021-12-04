module.exports = {
  prefix: "level",
  permissionLevel: "user",
  description: "Gets the current level name",
  run: (message, requestServerData) =>
    requestServerData(module.exports.prefix, (level) =>
      message.reply(`Current level: \`${level}\``, {
        reply: message.author,
      })
    ),
};
