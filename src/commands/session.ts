const Session = {
  prefix: "session",
  permissionLevel: "user",
  description: "Gets the current session ID",
  run: (message: any, requestServerData: any) =>
    requestServerData(Session.prefix, (session: string) =>
      message.reply(`Current session ID: \`${session}\``, {
        reply: message.author,
      })
    ),
};

export default Session;
