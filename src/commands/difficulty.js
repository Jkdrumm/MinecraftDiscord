module.exports = {
  prefix: "difficulty",
  permissionLevel: "user",
  description: "Gets the current difficulty",
  run: (message, requestServerData) =>
    requestServerData(module.exports.prefix, (difficulty) =>
      message.reply(`Current difficulty: \`${difficulty}\``, {
        reply: message.author,
      })
    ),
};
