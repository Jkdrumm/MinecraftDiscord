const Level = {
  prefix: "level",
  permissionLevel: "user",
  description: "Gets the current level name",
  run: (message: any, requestServerData: any) =>
    requestServerData(Level.prefix, (level: string) =>
      message.reply(`Current level: \`${level}\``, {
        reply: message.author,
      })
    ),
};

export default Level;
