import Log from "../../log/log";
import JavaHandler from "./javaHandler";
jest.mock("../../log/log");

describe("Java Handler", () => {
  const javaHandler = new JavaHandler(undefined, new Log());

  afterEach(() => {
    javaHandler.players = {};
    javaHandler.serverSettings = {};
    javaHandler.bufferedOutput = "";
  });

  it("should handle players joining", () => {
    const maxPlayers = 3;
    expect(Object.keys(javaHandler.players).length).toEqual(0);
    for (let i = 1; i <= maxPlayers; i++) {
      const username = `Player_${i}`;
      const uuid = `TEST-UUID-${i}`;
      javaHandler.handleData(
        `[12:34:56] [User Authenticator #1/INFO]: UUID of player ${username} is ${uuid}\n`
      );
      expect(Object.keys(javaHandler.players).length).toEqual(i);
      const id = Object.keys(javaHandler.players)[i - 1];
      expect(javaHandler.players[id]).toEqual(username);
      expect(id).toEqual(uuid);
    }
  });

  it("should handle players disconnecting", () => {
    const maxPlayers = 3;
    for (let i = 1; i <= maxPlayers; i++) {
      const username = `Player_${i}`;
      const id = `TEST-UUID-${i}`;
      javaHandler.players[id] = username;
    }
    for (let i = maxPlayers; i >= 1; i--) {
      const username = `Player_${i}`;
      const uuid = `TEST-UUID-${i}`;
      javaHandler?.handleData(
        `[12:34:56] [Server thread/INFO]: ${username} left the game\n`
      );
      expect(Object.keys(javaHandler.players).length).toEqual(i - 1);
      Object.keys(javaHandler.players).forEach((id) => {
        const username = javaHandler.players[id];
        expect(username === username && id === uuid).toEqual(false);
      });
    }
    expect(Object.keys(javaHandler.players).length).toEqual(0);
    javaHandler.handleData(
      "[12:34:56] [Server thread/INFO]: Extra_Player left the game\n"
    );
    expect(Object.keys(javaHandler.players).length).toEqual(0);
  });

  it("should set the minecraft version", () => {
    const testVersion = "test.version.1";
    javaHandler.handleData(
      `[12:34:56] [Server thread/INFO]: Starting minecraft server version ${testVersion}\n`
    );
    expect(javaHandler.serverSettings.version).toEqual(testVersion);
  });

  it("should set the ipv4 port", () => {
    const ipv4 = "123456";
    javaHandler.handleData(
      `[12:34:56] [Server thread/INFO]: Starting Minecraft server on *:${ipv4}\n`
    );
    expect(javaHandler.serverSettings.ipv4).toEqual(ipv4);
  });

  it("should set the level name", () => {
    const level = "bigDumb MinecraftWorld";
    javaHandler.handleData(
      `[12:34:56] [Server thread/INFO]: Preparing level "${level}"\n`
    );
    expect(javaHandler.serverSettings.level).toEqual(level);
  });

  it("should set the gamemode", () => {
    javaHandler.handleData(
      "[12:34:56] [Server thread/INFO]: Default game type: SURVIVAL\n"
    );
    expect(javaHandler.serverSettings.gamemode).toEqual("Survival");
  });

  it("should send the settings", () => {
    const spySendSettings = jest.spyOn(javaHandler, "sendSettings");
    javaHandler.handleData(
      `[12:34:56] [Server thread/INFO]: Done (17.628s)! For help, type "help"\n`
    );
    expect(spySendSettings).toHaveBeenCalled();
  });

  it("should process data when the beginning has been truncated", () => {
    const spySendInfo = jest.spyOn(javaHandler, "sendInfo");
    javaHandler.handleData(
      `rver thread/INFO]: Done (17.628s)! For help, type "help"\n`
    );
    expect(spySendInfo).toHaveBeenCalled();
  });

  it("should not process data when the ending has been truncated", () => {
    const spyProcessData = jest.spyOn(javaHandler, "processData");
    javaHandler.handleData(
      `[12:34:56] [Server thread/INFO]: Done (17.628s)! F`
    );
    expect(spyProcessData).not.toHaveBeenCalled();
  });

  it("should ignore processing data for loading status", () => {
    const spyProcessData = jest.spyOn(javaHandler, "processData");
    javaHandler.handleData(
      "[12:34:56] [Worker-Main-40/INFO]: Preparing spawn area: 69%\n"
    );
    expect(spyProcessData).not.toHaveBeenCalled();
  });
});
