import { MockSTDIN, stdin } from "mock-stdin";
import Bot from "../../discord/bot";
import {
  BotProperties,
  clearBotProperties,
  setProperties,
} from "../../settings/properties";
import propertiesReader from "properties-reader";
import CheckBotToken from "./checkBotToken";
let botToken: string | undefined;
const validBotToken = "test-discord-token";
jest.mock("properties-reader", () => () => ({
  getRaw: () => botToken,
  set: jest.fn(),
  save: jest.fn(),
}));
jest.mock(
  "../../discord/bot.ts",
  () =>
    class Bot {
      static bot: Bot;
      login() {
        return Promise.resolve("Successful login");
      }

      static getBot() {
        if (Bot.bot) Bot.bot = new Bot();
        return Bot.bot;
      }
    }
);
jest.mock("readline", () => ({
  createInterface: ({ input }: { input: NodeJS.ReadableStream }) =>
    jest.requireActual("readline").createInterface({
      input,
    }),
}));

describe("State Check Bot Token", () => {
  let input: MockSTDIN;
  let checkBotToken: CheckBotToken;

  beforeAll(() => {
    setProperties(propertiesReader("settings.properties"));
  });

  beforeEach(() => {
    clearBotProperties();
    input = stdin();
    checkBotToken = new CheckBotToken(new Bot());
  });

  it("should ask for a bot token", () => {
    botToken = undefined;
    const questionSpy = jest.spyOn(checkBotToken.rl, "question");
    const promise = checkBotToken.next();
    promise.then(() => {
      expect(questionSpy).toHaveBeenCalled();
    });
    checkBotToken.responseResolver?.(undefined);
  });

  it("exit when an invalid bot token is entered", async () => {
    botToken = undefined;
    checkBotToken.bot.login = jest.fn(() =>
      Promise.reject(new Error("An invalid token was provided."))
    );
    const promise = checkBotToken.next();
    input.send(`${validBotToken}\n`);
    try {
      await promise;
      fail();
    } catch {}
    expect(BotProperties.botToken).toBe(undefined);
  });

  it("should login to Discord when a valid bot token is entered", async () => {
    botToken = undefined;
    checkBotToken.bot.login = jest.fn(() =>
      Promise.resolve("Successful login")
    );
    const questionSpy = jest.spyOn(checkBotToken.rl, "question");
    const promise = checkBotToken.next();
    input.send(`${validBotToken}\n`);
    await promise;
    expect(questionSpy).toHaveBeenCalled();
    expect(BotProperties.botToken).toBe(validBotToken);
  });

  it("should login to Discord when a bot token is saved", async () => {
    botToken = validBotToken;
    await checkBotToken.next();
    expect(BotProperties.botToken).toBe(botToken);
  });

  it("should exit if it cannot connect to Discord with a saved bot token", async () => {
    botToken = validBotToken;
    BotProperties.botToken = botToken;
    checkBotToken.bot.login = jest.fn(() => Promise.reject("Unable to login"));
    let next;
    try {
      next = await checkBotToken.next();
    } catch {}
    expect(next).toBe(undefined);
    expect(BotProperties.botToken).toBe(validBotToken);
  });

  it("should exit if it cannot connect to Discord after asking for the bot token", async () => {
    botToken = undefined;
    checkBotToken.bot.login = jest.fn(() => Promise.reject("Unable to login"));
    const questionSpy = jest.spyOn(checkBotToken.rl, "question");
    const promise = checkBotToken.next();
    input.send(`${validBotToken}\n`);
    try {
      await promise;
      fail();
    } catch {}
    expect(questionSpy).toHaveBeenCalled();
    expect(BotProperties.botToken).toBe(undefined);
  });

  it("should save an empty bot token when an invalid one is loaded, and ask for a new token", async () => {
    botToken = validBotToken;
    checkBotToken.bot.login = jest.fn(() =>
      Promise.reject(new Error("An invalid token was provided."))
    );
    const questionSpy = jest.spyOn(checkBotToken.rl, "question");
    checkBotToken.next().then(() => {
      expect(questionSpy).toHaveBeenCalled();
      expect(BotProperties.botToken).toBe(undefined);
    });
    checkBotToken.responseResolver?.(undefined);
  });
});
