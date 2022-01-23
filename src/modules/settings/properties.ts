import propertiesReader from "properties-reader";
import { Guild, Message, User } from "discord.js";

export const propertiesPath = `${process.cwd()}\\settings.properties`;
export const usersPropertiesPath = `${process.cwd()}\\users.properties`;
export let properties: propertiesReader.Reader | undefined;
export const setProperties = (p: propertiesReader.Reader) => (properties = p);
export let userProperties: propertiesReader.Reader | undefined;
export const setUserProperties = (p: propertiesReader.Reader) =>
  (userProperties = p);
export const ServerProperties: any = {};
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
  players: { [discordID: string]: string };
} = {
  linkedUsers: {},
  unlinkedUsers: {},
  notifyUsers: {},
  players: {},
};

export const clearBotProperties = () =>
  (BotProperties = {
    linkedUsers: {},
    unlinkedUsers: {},
    notifyUsers: {},
    players: {},
  });
