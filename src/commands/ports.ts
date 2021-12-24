const Ports = {
  prefix: "ports",
  permissionLevel: "user",
  description: "Gets the server's IPv4 and IPv6 ports",
  run: (message: any, requestServerData: any) =>
    requestServerData(
      Ports.prefix,
      ({ ipv4, ipv6 }: { ipv4: string; ipv6: string }) =>
        message.reply(
          `Server Ports\n\`\`\`IPv4: ${ipv4}\nIPv6: ${ipv6}\`\`\``,
          {
            reply: message.author,
          }
        )
    ),
};

export default Ports;
