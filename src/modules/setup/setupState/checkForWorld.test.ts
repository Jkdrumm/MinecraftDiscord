import { Message, MessageReaction, User } from "discord.js";
import propertiesReader from "properties-reader";
import {
  BotProperties,
  ServerProperties,
  setProperties,
} from "../../settings/properties";
import CheckForWorld from "./checkForWorld";
import SetSeed from "./setSeed";

let levelName: string | undefined;
let fileExists: boolean;

jest.mock("fs", () => ({
  existsSync: jest.fn(() => fileExists),
  mkdirSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  readdirSync: () => [],
}));

jest.mock("properties-reader", () => () => ({
  get: () => levelName,
  set: jest.fn(),
  save: jest.fn(),
  readdirSync: jest.fn(),
}));

describe("State Check For World", () => {
  let checkForWorld: CheckForWorld;

  beforeAll(() => {
    setProperties(propertiesReader("settings.properties"));
  });

  beforeEach(() => {
    checkForWorld = new CheckForWorld();
    levelName = undefined;
    fileExists = false;
  });

  it("should not prompt the user if a world is found", () => {
    levelName = "superAwesomeMinecraftLevel";
    fileExists = true;
    const owner = {
      client: checkForWorld.bot.client,
      send: jest.fn(),
    } as unknown as User;
    BotProperties.owner = owner;
    const sendSpy = jest.spyOn(owner, "send");
    checkForWorld.next().then(() => expect(sendSpy).not.toHaveBeenCalled());
    checkForWorld.responseResolver?.(undefined);
  });

  it("should prompt the user if a world is not found for a Java Edition Server", () => {
    ServerProperties.isJavaEdition = true;
    fileExists = true;
    levelName = "superAwesomeMinecraftLevel";
    const owner = {
      client: checkForWorld.bot.client,
      send: jest.fn(),
    } as unknown as User;
    BotProperties.owner = owner;
    const sendSpy = jest.spyOn(owner, "send");
    checkForWorld.next().then(() => expect(sendSpy).not.toHaveBeenCalled());
    checkForWorld.responseResolver?.(undefined);
  });

  it("should prompt the user if a world is not found for a Bedrock Edition Server", () => {
    ServerProperties.isJavaEdition = false;
    fileExists = true;
    levelName = "superAwesomeMinecraftLevel";
    const owner = {
      client: checkForWorld.bot.client,
      send: jest.fn(),
    } as unknown as User;
    BotProperties.owner = owner;
    const sendSpy = jest.spyOn(owner, "send");
    checkForWorld.next().then(() => expect(sendSpy).not.toHaveBeenCalled());
    checkForWorld.responseResolver?.(undefined);
  });

  it("should start creating a new world if reacting with the 🆕 emoji", async () => {
    const owner = { client: checkForWorld.bot.client } as User;
    const reactionMessage = { client: checkForWorld.bot.client } as Message;
    checkForWorld.reactionMessage = reactionMessage;
    reactionMessage.author = owner;
    const reaction = {
      client: checkForWorld.bot.client,
      emoji: {
        name: "🆕",
      },
      message: reactionMessage,
    } as MessageReaction;
    reaction.message = checkForWorld.reactionMessage;
    reaction.message.id = "message-id";
    owner.id = "owner-id";
    BotProperties.owner = owner;
    checkForWorld.createPromise();
    checkForWorld.responsePromise?.then((nextState) =>
      expect(nextState).toBeInstanceOf(SetSeed)
    );
    await checkForWorld.handleReaction(reaction, owner);
  });
});
