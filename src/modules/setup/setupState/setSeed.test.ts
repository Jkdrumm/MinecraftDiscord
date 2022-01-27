import { Message, MessageReaction, User } from "discord.js";
import { BotProperties, ServerProperties } from "../../settings/properties";
import SetSeed from "./setSeed";

jest.mock("fs", () => ({
  existsSync: jest.fn(() => false),
  mkdirSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  readdirSync: () => [],
}));

describe("State Set Seed", () => {
  let setSeed: SetSeed;

  beforeEach(() => {
    setSeed = new SetSeed();
  });

  it("Should prompt the user to how to set the seed", async () => {
    const owner = {
      client: setSeed.bot.client,
      send: jest.fn(),
    } as unknown as User;
    BotProperties.owner = owner;
    const sendSpy = jest.spyOn(owner, "send");
    setSeed.next().then(() => expect(sendSpy).toHaveBeenCalled());
    setSeed.responseResolver?.(undefined);
  });

  it("should save an blank seed if reacting with ❓", async () => {
    const owner = { id: "owner-id" } as User;
    const reactionMessage = {
      client: setSeed.bot.client,
    } as Message;
    setSeed.reactionMessage = reactionMessage;
    reactionMessage.author = owner;
    const reaction = {
      client: setSeed.bot.client,
      emoji: {
        name: "❓",
      },
      message: reactionMessage,
    } as MessageReaction;
    reaction.message = setSeed.reactionMessage;
    reaction.message.id = "message-id";
    BotProperties.owner = owner;
    const saveSeedSpy = jest.spyOn(setSeed, "saveSeed");
    await setSeed.handleReaction(reaction, owner);
    expect(saveSeedSpy).toHaveBeenCalledWith();
  });

  it("should save an inputted seed if the user responds with a custom seed on Java Edition", async () => {
    ServerProperties.isJavaEdition = true;
    const owner = { client: setSeed.bot.client } as User;
    owner.id = "owner-id";
    BotProperties.owner = owner;
    const seed = "this-is-probably-a-very-bad-seed";
    const message = { client: setSeed.bot.client } as Message;
    message.content = `${seed}`;
    message.author = owner;
    const saveSeedSpy = jest.spyOn(setSeed, "saveSeed");
    await setSeed.handleMessage(message);
    expect(saveSeedSpy).toHaveBeenCalledWith(seed);
  });

  it("should save an inputted seed if the user responds with a custom seed on Bedrock Edition", async () => {
    ServerProperties.isJavaEdition = false;
    const owner = { client: setSeed.bot.client } as User;
    owner.id = "owner-id";
    BotProperties.owner = owner;
    const seed = "this-is-probably-a-very-bad-seed";
    const message = { client: setSeed.bot.client } as Message;
    message.content = `${seed}`;
    message.author = owner;
    const saveSeedSpy = jest.spyOn(setSeed, "saveSeed");
    await setSeed.handleMessage(message);
    expect(saveSeedSpy).toHaveBeenCalledWith(seed);
  });
});
