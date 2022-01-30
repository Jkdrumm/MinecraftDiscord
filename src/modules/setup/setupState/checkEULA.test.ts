import fs from "fs";
import { Message, MessageReaction, User } from "discord.js";
import propertiesReader from "properties-reader";
import {
  BotProperties,
  ServerProperties,
  setProperties,
} from "../../settings/properties";
import CheckEULA from "./checkEULA";

let isJavaEdition: boolean | null;
let fileExists: boolean;
let eula: boolean;

jest.mock("fs", () => ({
  existsSync: jest.fn(() => fileExists),
  readFileSync: jest.fn(() => `# comment\n# comment again\neula=${eula}`),
  writeFileSync: jest.fn(),
  readdirSync: () => [],
  mkdirSync: jest.fn(),
}));

jest.mock("properties-reader", () => () => ({
  get: () => isJavaEdition,
  set: jest.fn(),
  save: jest.fn(),
  readdirSync: jest.fn(),
}));

describe("State Check EULA", () => {
  let checkEULA: CheckEULA;

  beforeAll(() => {
    setProperties(propertiesReader("settings.properties"));
  });

  beforeEach(() => {
    checkEULA = new CheckEULA();
    ServerProperties.isJavaEdition = null;
    fileExists = false;
    eula = false;
  });

  it("should immideately continue if the server is Bedrock Edition", async () => {
    ServerProperties.isJavaEdition = false;
    const existsSyncSpy = jest.spyOn(fs, "existsSync");
    await checkEULA.next();
    expect(existsSyncSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("eula.txt")
    );
  });

  it("should load the EULA file if running a Java Edition server", async () => {
    fileExists = true;
    eula = true;
    ServerProperties.isJavaEdition = true;
    const owner = {
      client: checkEULA.bot.client,
      send: jest.fn(),
    } as unknown as User;
    BotProperties.owner = owner;
    const sendSpy = jest.spyOn(owner, "send");
    await checkEULA.next();
    expect(sendSpy).not.toHaveBeenCalled();
  });

  it("should ask the user to agree to the EULA if they have not yet agreed", async () => {
    ServerProperties.isJavaEdition = true;
    const owner = {
      client: checkEULA.bot.client,
      send: jest.fn(),
    } as unknown as User;
    BotProperties.owner = owner;
    const sendSpy = jest.spyOn(owner, "send");
    checkEULA
      .next()
      .then(() =>
        expect(sendSpy).toHaveBeenLastCalledWith(
          expect.stringContaining(
            "https://account.mojang.com/documents/minecraft_eula"
          )
        )
      );
    checkEULA.responseResolver?.(undefined);
  });

  it("should save the EULA agreement if reacting with ✅", async () => {
    fileExists = true;
    const owner = { client: checkEULA.bot.client } as User;
    const reactionMessage = {
      client: checkEULA.bot.client,
    } as Message;
    checkEULA.reactionMessage = reactionMessage;
    reactionMessage.author = owner;
    const reaction = {
      client: checkEULA.bot.client,
      emoji: {
        name: "✅",
      },
      message: reactionMessage,
    } as MessageReaction;
    reaction.message = checkEULA.reactionMessage;
    reaction.message.id = "message-id";
    owner.id = "owner-id";
    BotProperties.owner = owner;
    const writeFileSpy = jest.spyOn(fs, "writeFileSync");
    await checkEULA.handleReaction(reaction, owner);
    expect(writeFileSpy).toHaveBeenCalled();
  });

  it("should fetch the message's author if it is not known for some reason", async () => {
    const owner = { client: checkEULA.bot.client } as User;
    const reactionMessage = {
      client: checkEULA.bot.client,
      author: owner,
    } as Message;
    checkEULA.reactionMessage = reactionMessage;
    const reaction = {
      client: checkEULA.bot.client,
      emoji: {
        name: "✅",
      },
      message: reactionMessage,
    } as MessageReaction;
    reaction.message = checkEULA.reactionMessage;
    reaction.message.id = "message-id";
    reaction.message.fetch = () => {
      reactionMessage.author = owner;
      return Promise.resolve(reactionMessage);
    };
    owner.id = "owner-id";
    BotProperties.owner = owner;
    await checkEULA.handleReaction(reaction, owner);
    expect(reactionMessage.author).toEqual(owner);
  });

  it("should not agree to the EULA if a different reaction is used", async () => {
    const owner = { client: checkEULA.bot.client } as User;
    const reactionMessage = {
      client: checkEULA.bot.client,
    } as Message;
    checkEULA.reactionMessage = reactionMessage;
    reactionMessage.author = owner;
    const reaction = {
      client: checkEULA.bot.client,
      emoji: {
        name: "🤮",
      },
      message: reactionMessage,
    } as MessageReaction;
    reaction.message = reactionMessage;
    reaction.message.id = "message-id";
    owner.id = "owner-id";
    BotProperties.owner = owner;
    const writeFileSpy = jest.spyOn(fs, "writeFileSync");
    await checkEULA.handleReaction(reaction, owner);
    expect(writeFileSpy).not.toHaveBeenCalled();
  });
});
