import { Message, MessageReaction, User } from "discord.js";
import propertiesReader from "properties-reader";
import {
  BotProperties,
  ServerProperties,
  setProperties,
} from "../../settings/properties";
import CheckMinecraftEdition from "./checkMinecraftEdition";

let isJavaEdition: boolean | null;

jest.mock("properties-reader", () => () => ({
  get: () => isJavaEdition,
  set: jest.fn(),
  save: jest.fn(),
}));

describe("Stat Check Minecraft Edition", () => {
  let checkMinecraftEdition: CheckMinecraftEdition;

  beforeAll(() => {
    setProperties(propertiesReader("settings.properties"));
  });

  beforeEach(() => {
    ServerProperties.isJavaEdition = undefined;
    checkMinecraftEdition = new CheckMinecraftEdition();
  });

  it("should load the edition if has been saved", async () => {
    isJavaEdition = true;
    await checkMinecraftEdition.next();
    expect(ServerProperties.isJavaEdition).toBe(true);
  });

  it("should prompt the user to determine which Minecraft to use if no version has been selected", () => {
    isJavaEdition = null;
    const owner = { id: "owner-id", send: jest.fn() } as unknown as User;
    BotProperties.owner = owner;
    const sendSpy = jest.spyOn(owner, "send");
    checkMinecraftEdition.next().then(() => expect(sendSpy).toHaveBeenCalled());
    checkMinecraftEdition.responseResolver?.(undefined);
  });

  it("should be a java edition server if reacting with 1️⃣", async () => {
    const owner = { id: "owner-id", send: jest.fn() } as unknown as User;
    const reactionMessage = {
      client: checkMinecraftEdition.bot.client,
    } as Message;
    checkMinecraftEdition.reactionMessage = reactionMessage;
    checkMinecraftEdition.reactionMessage.author = owner;
    const reaction = {
      client: checkMinecraftEdition.bot.client,
      emoji: {
        name: "1️⃣",
      },
      message: checkMinecraftEdition.reactionMessage,
    } as MessageReaction;
    reaction.message = checkMinecraftEdition.reactionMessage;
    reaction.message.id = "message-id";
    owner.id = "owner-id";
    BotProperties.owner = owner;
    await checkMinecraftEdition.handleReaction(reaction, owner);
    expect(ServerProperties.isJavaEdition).toBe(true);
  });

  it("should be a bedrock edition server if reacting with 2️⃣", async () => {
    const owner = { id: "owner-id", send: jest.fn() } as unknown as User;
    const reactionMessage = {
      client: checkMinecraftEdition.bot.client,
    } as Message;
    checkMinecraftEdition.reactionMessage = reactionMessage;
    checkMinecraftEdition.reactionMessage.author = owner;
    const reaction = {
      client: checkMinecraftEdition.bot.client,
      emoji: {
        name: "2️⃣",
      },
      message: checkMinecraftEdition.reactionMessage,
    } as MessageReaction;
    reaction.message = checkMinecraftEdition.reactionMessage;
    reaction.message.id = "message-id";
    owner.id = "owner-id";
    BotProperties.owner = owner;
    await checkMinecraftEdition.handleReaction(reaction, owner);
    expect(ServerProperties.isJavaEdition).toBe(false);
  });

  it("should not set the minecraft edition if a different reaction is used", async () => {
    const owner = { id: "owner-id", send: jest.fn() } as unknown as User;
    const reactionMessage = {
      client: checkMinecraftEdition.bot.client,
    } as Message;
    checkMinecraftEdition.reactionMessage = reactionMessage;
    checkMinecraftEdition.reactionMessage.author = owner;
    const reaction = {
      client: checkMinecraftEdition.bot.client,
      emoji: {
        name: "❓",
      },
      message: checkMinecraftEdition.reactionMessage,
    } as MessageReaction;
    reaction.message = checkMinecraftEdition.reactionMessage;
    reaction.message.id = "message-id";
    owner.id = "owner-id";
    BotProperties.owner = owner;
    await checkMinecraftEdition.handleReaction(reaction, owner);
    expect(ServerProperties.isJavaEdition).toBe(undefined);
  });

  it("should fetch the message's author if it is not known for some reason", async () => {
    const owner = { id: "owner-id", send: jest.fn() } as unknown as User;
    const reactionMessage = {
      client: checkMinecraftEdition.bot.client,
    } as Message;
    checkMinecraftEdition.reactionMessage = reactionMessage;
    const reaction = {
      client: checkMinecraftEdition.bot.client,
      emoji: {
        name: "❓",
      },
      message: checkMinecraftEdition.reactionMessage,
    } as MessageReaction;
    reaction.message = checkMinecraftEdition.reactionMessage;
    reaction.message.id = "message-id";
    reaction.message.fetch = () => {
      reactionMessage.author = owner;
      return Promise.resolve(reactionMessage);
    };
    BotProperties.owner = owner;
    await checkMinecraftEdition.handleReaction(reaction, owner);
    expect(reactionMessage.author).toBe(owner);
  });
});
