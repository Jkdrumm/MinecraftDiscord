module.exports = {
  prefix: "ports",
  permissionLevel: "user",
  description: "Gets the server's IPv4 and IPv6 ports",
  run: (message, requestServerData) =>
    requestServerData(module.exports.prefix, ({ ipv4, ipv6 }) =>
      message.reply(`Server Ports\n\`\`\`IPv4: ${ipv4}\nIPv6: ${ipv6}\`\`\``, {
        reply: message.author,
      })
    ),
};
