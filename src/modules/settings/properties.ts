import propertiesReader from "properties-reader";
import { Guild, Message, User } from "discord.js";

export const propertiesPath = `${process.cwd()}\\settings.properties`;
export const usersPropertiesPath = `${process.cwd()}\\users.properties`;
export let properties: propertiesReader.Reader | undefined;
export const setProperties = (p: propertiesReader.Reader) => (properties = p);
export let userProperties: propertiesReader.Reader | undefined;
export const setUserProperties = (p: propertiesReader.Reader) =>
  (userProperties = p);
export const ServerProperties: {
  isJavaEdition: boolean | null;
  version: string;
  serverID?: string;
  rolesChannel?: string;
  logChannel?: string;
  server: any;
  settings: { [setting: string]: string };
  players: { [discordID: string]: string };
} = {
  isJavaEdition: null,
  version: "",
  serverID: "",
  rolesChannel: "",
  logChannel: "",
  server: {},
  settings: {},
  players: {},
};
export let BotProperties: {
  botToken?: string;
  owner?: User;
  applicationId?: string;
  inviteLink?: string;
  serverID?: string;
  primaryServer?: Guild;
  notificationMessage?: Message;
  domainName?: string;
  linkedUsers: { [discordID: string]: string };
  unlinkedUsers: { [discordID: string]: string };
  notifyUsers: { [notificationLevel: string | number]: string[] };
} = {
  linkedUsers: {},
  unlinkedUsers: {},
  notifyUsers: {},
};

export const clearBotProperties = () =>
  (BotProperties = {
    linkedUsers: {},
    unlinkedUsers: {},
    notifyUsers: {},
  });
