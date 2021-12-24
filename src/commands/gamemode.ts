const Gamemode = {
  prefix: "gamemode",
  permissionLevel: "user",
  description: "Gets the current game mode",
  run: (message: any, requestServerData: any) =>
    requestServerData(Gamemode.prefix, (gamemode: string) =>
      message.reply(`Current game mode: \`${gamemode}\``, {
        reply: message.author,
      })
    ),
};

export default Gamemode;
