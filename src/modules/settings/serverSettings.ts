import { ServerProperties, properties } from "./properties";

export const loadProperties = async () => {
  if (!properties) return;
  // properties.each((key, value) => {
  //   if (key.startsWith("command.")) ServerCommands[key.substring(8)] = value;
  // });
  ServerProperties.serverID = properties.getRaw("discord.server")?.toString();
  ServerProperties.logChannel = properties
    .getRaw("discord.channel.log")
    ?.toString();
  ServerProperties.rolesChannel = properties
    .getRaw("discord.channel.roles")
    ?.toString();
  ServerProperties.serverURL = properties.getRaw("server.url")?.toString();
  ServerProperties.serverPort = properties.get("server.port")?.toString();
};

export default ServerProperties;
