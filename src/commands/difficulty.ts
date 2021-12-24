const Difficulty = {
  prefix: "difficulty",
  permissionLevel: "user",
  description: "Gets the current difficulty",
  run: (message: any, requestServerData: any) =>
    requestServerData(Difficulty.prefix, (difficulty: string) =>
      message.reply(`Current difficulty: \`${difficulty}\``, {
        reply: message.author,
      })
    ),
};

export default Difficulty;
