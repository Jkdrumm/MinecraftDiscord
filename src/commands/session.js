module.exports = {
  prefix: "session",
  permissionLevel: "user",
  description: "Gets the current session ID",
  run: (message, requestServerData) =>
    requestServerData(module.exports.prefix, (session) =>
      message.reply(`Current session ID: \`${session}\``, {
        reply: message.author,
      })
    ),
};
