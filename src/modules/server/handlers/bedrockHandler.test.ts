import Log from "../../log/log";
import BedrockHandler from "./bedrockHandler";
jest.mock("../../log/log");

describe("Bedrock Handler", () => {
  const bedrockHandler = new BedrockHandler(undefined, new Log());

  afterEach(() => {
    bedrockHandler.players = {};
    bedrockHandler.serverSettings = {};
    bedrockHandler.bufferedOutput = "";
  });

  it("should handle players joining", () => {
    const maxPlayers = 3;
    expect(Object.keys(bedrockHandler.players).length).toEqual(0);
    for (let i = 1; i <= maxPlayers; i++) {
      const username = `Player_${i}`;
      const xuid = `TEST-XUID-${i}`;
      bedrockHandler.handleData(
        `[1234-56-78 12:34:56:789 INFO] Player connected: ${username}, xuid: ${xuid}\n`
      );
      expect(Object.keys(bedrockHandler.players).length).toEqual(i);
      const id = Object.keys(bedrockHandler.players)[i - 1];
      expect(bedrockHandler.players[id]).toEqual(username);
      expect(id).toEqual(xuid);
    }
  });

  it("should handle players disconnecting", () => {
    const maxPlayers = 3;
    for (let i = 1; i <= maxPlayers; i++) {
      const username = `Player_${i}`;
      const id = `TEST-XUID-${i}`;
      bedrockHandler.players[id] = username;
    }
    for (let i = maxPlayers; i >= 1; i--) {
      const username = `Player_${i}`;
      const xuid = `TEST-XUID-${i}`;
      bedrockHandler.handleData(
        `[1234-56-78 12:34:56:789 INFO] Player disconnected: ${username}, xuid: ${xuid}\n`
      );
      expect(Object.keys(bedrockHandler.players).length).toEqual(i - 1);
      Object.keys(bedrockHandler.players).forEach((id) => {
        const username = bedrockHandler.players[id];
        expect(username === username && id === xuid).toEqual(false);
      });
    }
    expect(Object.keys(bedrockHandler.players).length).toEqual(0);
    bedrockHandler.handleData(
      "[1234-56-78 12:34:56:789 INFO] Player disconnected: EXTRA_PLAYER, xuid: TEST-XUID-0\n"
    );
    expect(Object.keys(bedrockHandler.players).length).toEqual(0);
  });

  it("should set the minecraft version", () => {
    const testVersion = "test.version.1";
    bedrockHandler.handleData(
      `[1234-56-78 12:34:56:789 INFO] Version ${testVersion}\n`
    );
    expect(bedrockHandler.serverSettings.version).toEqual(testVersion);
  });

  it("should set the ipv4 port", () => {
    const ipv4 = "123456";
    bedrockHandler.handleData(
      `[1234-56-78 12:34:56:789 INFO] IPv4 supported, port: ${ipv4}\n`
    );
    expect(bedrockHandler.serverSettings.ipv4).toEqual(ipv4);
  });

  it("should set the ipv6 port", () => {
    const ipv6 = "123456";
    bedrockHandler.handleData(
      `[1234-56-78 12:34:56:789 INFO] IPv6 supported, port: ${ipv6}\n`
    );
    expect(bedrockHandler.serverSettings.ipv6).toEqual(ipv6);
  });

  it("should set the level name", () => {
    const level = "bigDumb MinecraftWorld";
    bedrockHandler.handleData(
      `[1234-56-78 12:34:56:789 INFO] Level Name: ${level}\n`
    );
    expect(bedrockHandler.serverSettings.level).toEqual(level);
  });

  it("should set the server session", () => {
    const session = "random-session-characters";
    bedrockHandler.handleData(
      `[1234-56-78 12:34:56:789 INFO] Session ID ${session}\n`
    );
    expect(bedrockHandler.serverSettings.session).toEqual(session);
  });

  it("should set the gamemode", () => {
    bedrockHandler.handleData(
      "[1234-56-78 12:34:56:789 INFO] Game mode: 0 Survival\n"
    );
    expect(bedrockHandler.serverSettings.gamemode).toEqual("Survival");
  });

  it("should set the difficulty", () => {
    bedrockHandler.handleData(
      "[1234-56-78 12:34:56:789 INFO] Difficulty: 2 NORMAL\n"
    );
    expect(bedrockHandler.serverSettings.difficulty).toEqual("Normal");
  });

  it("should send the settings", () => {
    const spySendSettings = jest.spyOn(bedrockHandler, "sendSettings");
    bedrockHandler.handleData(
      "[1234-56-78 12:34:56:789 INFO] Server started.\n"
    );
    expect(spySendSettings).toHaveBeenCalled();
  });

  it("should process data when the beginning has been truncated", () => {
    const spySendInfo = jest.spyOn(bedrockHandler, "sendInfo");
    bedrockHandler.handleData("34:56:789 INFO] Server started.\n");
    expect(spySendInfo).toHaveBeenCalled();
  });

  it("should not process data when the ending has been truncated", () => {
    const spyProcessData = jest.spyOn(bedrockHandler, "processData");
    bedrockHandler.handleData("[1234-56-78 12:34:56:789 INFO] Ser");
    expect(spyProcessData).not.toHaveBeenCalled();
  });

  it("should ignore processing data for 'Running AutoCompaction'", () => {
    const spyProcessData = jest.spyOn(bedrockHandler, "processData");
    bedrockHandler.handleData(
      "[1234-56-78 12:34:56:789 INFO] Running AutoCompaction...\n"
    );
    expect(spyProcessData).not.toHaveBeenCalled();
  });
});
