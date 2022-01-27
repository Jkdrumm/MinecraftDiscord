import { Message, User } from "discord.js";
import propertiesReader from "properties-reader";
import {
  BotProperties,
  clearBotProperties,
  setProperties,
} from "../../settings/properties";
import CheckPrimaryServer from "./checkPrimaryServer";
let serverID: string | undefined;
const inviteLink = "www.dabomb.com/invite-this-bot-or-else";
const validServerID = "server-id";
const validMockGuilds: { name?: string; id: string }[] = [
  { name: "server-1", id: "abc" },
  { name: "server-2", id: "def" },
  { name: "server-3", id: "ghi" },
];
let currentGuilds = validMockGuilds;
let mockGuilds = {
  cache: {
    values: () => currentGuilds,
    size: currentGuilds.length,
    get: () => {},
  },
  fetch: (id: string) => validMockGuilds.find((guild) => guild.id === id),
};
jest.mock("properties-reader", () => () => ({
  getRaw: () => serverID,
  set: jest.fn(),
  save: jest.fn(),
}));

jest.mock("discord.js", () => {
  const mock = jest.createMockFromModule("discord.js") as any;
  mock.Client = class {
    on = jest.fn();
    removeAllListeners = jest.fn();
    guilds = mockGuilds;
  };
  return mock;
});

describe("State Check Primary Server", () => {
  let checkPrimaryServer: CheckPrimaryServer;

  beforeAll(() => {
    setProperties(propertiesReader("settings.properties"));
  });

  beforeEach(() => {
    clearBotProperties();
    checkPrimaryServer = new CheckPrimaryServer();
  });

  it("should load the Server ID if already saved", async () => {
    serverID = validServerID;
    await checkPrimaryServer.next();
    expect(BotProperties.serverID).toBe(serverID);
  });

  it("should send a message if no primary server has been selected", async () => {
    serverID = undefined;
    const owner = { send: jest.fn() } as unknown as User;
    BotProperties.owner = owner;
    const sendSpy = jest.spyOn(owner, "send");
    checkPrimaryServer.next().then(() => expect(sendSpy).toHaveBeenCalled());
    checkPrimaryServer.responseResolver?.(undefined);
  });

  it("should set the server upon inputting a valid server", async () => {
    serverID = undefined;
    const ownerID = "owner-id";
    const author = { id: ownerID, send: jest.fn() } as unknown as User;
    BotProperties.owner = author;
    const messageServerIndex = 2; // This is a 1 based index since this is what the user will input
    const message = { client: checkPrimaryServer.bot.client } as Message;
    message.content = `${messageServerIndex}`;
    message.author = author;
    const sendSpy = jest.spyOn(author, "send");
    checkPrimaryServer.createPromise();
    await checkPrimaryServer.handleMessage(message);
    expect(currentGuilds[1].name).not.toBe(undefined);
    if (currentGuilds[1].name)
      expect(sendSpy).toHaveBeenCalledWith(
        expect.stringContaining(currentGuilds[1].name)
      );
    expect(BotProperties.serverID).toBe(
      currentGuilds[messageServerIndex - 1].id
    );
  });

  it("should send the invite link if the bot is not in any servers", async () => {
    serverID = undefined;
    currentGuilds = [];
    mockGuilds.cache = {
      values: () => currentGuilds,
      size: currentGuilds.length,
      get: jest.fn(),
    };
    checkPrimaryServer.bot.client.guilds = mockGuilds as any;
    BotProperties.inviteLink = inviteLink;
    const owner = { send: jest.fn() } as unknown as User;
    BotProperties.owner = owner;
    const sendSpy = jest.spyOn(owner, "send");
    checkPrimaryServer.continueServerSetup().then(() => {
      expect(BotProperties.inviteLink).toBe(inviteLink);
      if (BotProperties.inviteLink)
        expect(sendSpy).toHaveBeenCalledWith(
          expect.stringContaining(BotProperties.inviteLink)
        );
    });
    checkPrimaryServer.responseResolver?.(undefined);
  });

  it("should fetch server names if they are not cached", () => {
    serverID = undefined;
    currentGuilds = [
      { name: "server-1", id: "abc" },
      { name: undefined, id: "def" },
      { name: undefined, id: "ghi" },
    ];
    mockGuilds = {
      cache: {
        values: () => currentGuilds,
        size: currentGuilds.length,
        get: jest.fn(),
      },
      fetch: (id: string) => validMockGuilds.find((guild) => guild.id === id),
    };
    checkPrimaryServer.bot.client.guilds = mockGuilds as any;
    const owner = {} as User;
    BotProperties.owner = owner;
    const fetchSpy = jest.spyOn(checkPrimaryServer.bot.client.guilds, "fetch");
    checkPrimaryServer
      .continueServerSetup()
      .then(() => expect(fetchSpy).toHaveBeenCalledTimes(2));
    checkPrimaryServer.responseResolver?.(undefined);
  });

  it("should not save the primary server if an invalid selection is made", async () => {
    serverID = undefined;
    const ownerID = "owner-id";
    const author = { id: ownerID, send: jest.fn() } as unknown as User;
    BotProperties.owner = author;
    const messageServerIndex = 5;
    const message = { client: checkPrimaryServer.bot.client } as Message;
    message.content = `${messageServerIndex}`;
    message.author = author;
    const sendSpy = jest.spyOn(author, "send");
    await checkPrimaryServer.handleMessage(message);
    expect(sendSpy).toHaveBeenCalled();
    expect(BotProperties.serverID).toBe(undefined);
  });

  it("should send the invite link if the last selection is selected", async () => {
    serverID = undefined;
    const ownerID = "owner-id";
    const author = { id: ownerID, send: jest.fn() } as unknown as User;
    BotProperties.owner = author;
    const messageServerIndex = validMockGuilds.length + 1;
    const message = { client: checkPrimaryServer.bot.client } as Message;
    message.content = `${messageServerIndex}`;
    message.author = author;
    const sendSpy = jest.spyOn(author, "send");
    BotProperties.inviteLink = inviteLink;
    await checkPrimaryServer.handleMessage(message);
    if (BotProperties.inviteLink)
      expect(sendSpy).toHaveBeenCalledWith(
        expect.stringContaining(BotProperties.inviteLink)
      );
    expect(BotProperties.serverID).toBe(undefined);
  });

  it("should not process input if someone who isn't the bot's owner sends a message", async () => {
    serverID = undefined;
    currentGuilds = validMockGuilds;
    mockGuilds.cache = {
      values: () => currentGuilds,
      size: currentGuilds.length,
      get: jest.fn(),
    };
    checkPrimaryServer.bot.client.guilds = mockGuilds as any;
    const ownerID = "owner-id";
    const authorID = "author-id";
    const owner = { id: ownerID } as User;
    const author = { id: authorID } as User;
    BotProperties.owner = owner;
    const messageServerIndex = 2; // This is a 1 based index since this is what the user will input
    const message = { client: checkPrimaryServer.bot.client } as Message;
    message.content = `${messageServerIndex}`;
    message.author = author;
    await checkPrimaryServer.handleMessage(message);
    expect(currentGuilds[1].name).not.toBe(undefined);
    expect(BotProperties.serverID).toBe(undefined);
  });

  it("should say hello when loading for the first time", () => {
    const owner = { send: jest.fn() } as unknown as User;
    BotProperties.owner = owner;
    const sendSpy = jest.spyOn(owner, "send");
    checkPrimaryServer
      .continueServerSetup(true)
      .then(() =>
        expect(sendSpy).toHaveBeenCalledWith(expect.stringContaining("Hello"))
      );
    checkPrimaryServer.responseResolver?.(undefined);
  });
});
