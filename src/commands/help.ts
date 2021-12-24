const Help = {
  prefix: "help",
  permissionLevel: "user",
  description: "How you got here",
  run: (message: any, commands: any) => {
    let reply =
      "Here is a full list of server commands that you have access to:```";
    for (const [commandName, command] of Object.entries(commands))
      reply += `\n!${commandName}${" ".repeat(16 - commandName.length)} : ${
        (command as any).description
      }`;
    reply += "```";
    message.reply(reply, {
      reply: message.author,
    });
  },
};

export default Help;
