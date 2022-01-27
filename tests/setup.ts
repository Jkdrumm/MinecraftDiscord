console.log = jest.fn();
jest.mock("discord.js", () => {
  const mock = jest.createMockFromModule("discord.js") as any;
  const actual = jest.requireActual("discord.js");
  mock.MessageReaction = actual.MessageReaction;
  mock.ReactionEmoji = actual.ReactionEmoji;
  mock.Emoji = actual.Emoji;
  mock.Client = class {
    on = jest.fn();
    addListener = jest.fn();
    removeAllListeners = jest.fn();
  };
  return mock;
});
jest.mock("fs", () => {
  const actual = jest.requireActual("fs");
  return {
    readdirSync: actual.readdirSync,
    writeFileSync: jest.fn(),
    createWriteStream: () => ({ write: jest.fn() }),
    existsSync: jest.fn(),
    mkdirSync: jest.fn(),
  };
});
jest.mock("properties-reader", () => () => ({
  set: jest.fn(),
  save: jest.fn(),
}));

afterEach(() => jest.clearAllMocks());

process.on("unhandledRejection", (error) => {
  fail(error);
});
