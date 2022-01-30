import Log from "../../log/log";
import JavaHandler from "./javaHandler";
jest.mock("../../log/log");

describe("Server Handler", () => {
  const serverHandler = new JavaHandler(undefined, new Log());

  afterEach(() => {
    serverHandler.players = {};
    serverHandler.serverSettings = {};
    serverHandler.discordBot = undefined;
  });

  it("should be createable with just a discord bot", () => {
    new JavaHandler("I guess this is a discord bot?");
  });

  it("should set the discord bot", () => {
    const discordBot = "anything is allowed here technically";
    serverHandler.setDiscordBot(discordBot);
    expect(serverHandler.discordBot).toEqual(discordBot);
  });

  it("should send info", () => {
    const spySendInfo = jest.spyOn(serverHandler, "sendInfo");
    serverHandler.sendData("Happy", "INFO");
    expect(spySendInfo).toHaveBeenCalled;
  });

  it("should send warnings", () => {
    const spySendWarning = jest.spyOn(serverHandler, "sendWarning");
    serverHandler.sendData("Uh oh", "WARN");
    expect(spySendWarning).toHaveBeenCalled;
  });

  it("should send errors", () => {
    const spySendError = jest.spyOn(serverHandler, "sendError");
    serverHandler.sendData("Super uh oh", "ERROR");
    expect(spySendError).toHaveBeenCalled;
  });
});
