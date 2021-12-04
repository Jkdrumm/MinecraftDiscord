module.exports = {
  prefix: "version",
  permissionLevel: "user",
  description: "Gets the current game version",
  run: (message, requestServerData) =>
    requestServerData(module.exports.prefix, (version) =>
      message.reply(`Current version : \`${version}\``, {
        reply: message.author,
      })
    ),
};
