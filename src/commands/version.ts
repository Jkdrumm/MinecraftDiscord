const Version = {
  prefix: "version",
  permissionLevel: "user",
  description: "Gets the current game version",
  run: (message: any, requestServerData: any) =>
    requestServerData(Version.prefix, (version: string) =>
      message.reply(`Current version : \`${version}\``, {
        reply: message.author,
      })
    ),
};

export default Version;
