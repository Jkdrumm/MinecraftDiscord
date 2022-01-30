import { User } from "discord.js";
import { BotProperties } from "../../settings/properties";
import CheckJavaVersion from "./checkJavaVersion";

// jest.mock("child_process");

describe("State Check Java Version", () => {
  let checkJavaVersion: CheckJavaVersion;

  beforeEach(() => {
    checkJavaVersion = new CheckJavaVersion();
  });

  it("should check the Java version", () => {
    const versionSpy = jest.spyOn(checkJavaVersion, "getJavaVersion");
    checkJavaVersion.next();
    expect(versionSpy).toHaveBeenCalledTimes(1);
  });

  it("should parse the Java version from running 'java --version' in the command line", () => {
    const version = "17.0.1";
    const callback = jest.fn();
    const callbackObject = { callback };
    const callbackSpy = jest.spyOn(callbackObject, "callback");
    const spawn = checkJavaVersion.getJavaVersion(callback);
    spawn.emit("data", `java version "${version}" 2021-10-19 LTS`);
    spawn.emit(
      "data",
      "Java(TM) SE Runtime Environment (build 17.0.1+12-LTS-39)"
    );
    spawn.emit(
      "data",
      "Java HotSpot(TM) 64-Bit Server VM (build 17.0.1+12-LTS-39, mixed mode, sharing)"
    );
    spawn.emit("exit");
    expect(callbackSpy).toHaveBeenCalledTimes(1);
    expect(callbackSpy).toHaveBeenCalledWith(version);
  });

  it("should still call the callback if there is no java installed", () => {
    const callback = jest.fn();
    const callbackObject = { callback };
    const callbackSpy = jest.spyOn(callbackObject, "callback");
    const spawn = checkJavaVersion.getJavaVersion(callback);
    spawn.emit(
      "data",
      "'java' is not recognized as an internal or external command,"
    );
    spawn.emit("data", "operable program or batch file.");
    spawn.emit("exit");
    expect(callbackSpy).toHaveBeenCalledTimes(1);
    expect(callbackSpy).toHaveBeenCalledWith(undefined);
  });

  it("should send an error to the callback if there is an error when parsing the java version", () => {
    const version = "17.0.1";
    const callback = jest.fn();
    const callbackObject = { callback };
    const callbackSpy = jest.spyOn(callbackObject, "callback");
    const spawn = checkJavaVersion.getJavaVersion(callback);
    spawn.emit("data", `java version "${version}" 2021-10-19 LTS`);
    spawn.emit(
      "data",
      "Java(TM) SE Runtime Environment (build 17.0.1+12-LTS-39)"
    );
    spawn.emit(
      "data",
      "Java HotSpot(TM) 64-Bit Server VM (build 17.0.1+12-LTS-39, mixed mode, sharing)"
    );
    const errorMessage = "Unable to get Java Version";
    spawn.emit("error", errorMessage);
    expect(callbackSpy).toHaveBeenCalledTimes(1);
    expect(callbackSpy).toHaveBeenCalledWith(undefined, errorMessage);
  });

  it("should prompt the user with a download link to download Java if it is not already installed", () => {
    BotProperties.owner = { send: jest.fn() } as unknown as User;
    const sendSpy = jest.spyOn(BotProperties.owner, "send");
    checkJavaVersion.handleJavaVersion(undefined);
    expect(sendSpy).toHaveBeenCalledTimes(1);
    expect(sendSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "https://www.oracle.com/java/technologies/downloads/"
      )
    );
  });

  it("should prompt the user with a download link to download Java if their major java version is less than 16", () => {
    BotProperties.owner = { send: jest.fn() } as unknown as User;
    const sendSpy = jest.spyOn(BotProperties.owner, "send");
    checkJavaVersion.handleJavaVersion("12.0.3");
    expect(sendSpy).toHaveBeenCalledTimes(1);
    expect(sendSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "https://www.oracle.com/java/technologies/downloads/"
      )
    );
  });

  it("should not prompt the user their major java version is at least 16", () => {
    BotProperties.owner = { send: jest.fn() } as unknown as User;
    const sendSpy = jest.spyOn(BotProperties.owner, "send");
    checkJavaVersion.handleJavaVersion("16.3.18");
    expect(sendSpy).not.toHaveBeenCalled();
  });

  it("should send the error to the user if there is an error when parsing the Java version", () => {
    BotProperties.owner = { send: jest.fn() } as unknown as User;
    const sendSpy = jest.spyOn(BotProperties.owner, "send");
    const errorMessage = "Unable to get java version";
    checkJavaVersion.handleJavaVersion(undefined, errorMessage);
    expect(sendSpy).toHaveBeenCalledTimes(1);
    expect(sendSpy).toHaveBeenCalledWith(expect.stringContaining(errorMessage));
  });

  it("should check the java version if reacting with the 🔁 emoji", () => {
    const checkJavaVersionSpy = jest.spyOn(checkJavaVersion, "getJavaVersion");
    checkJavaVersion.reactionOptions("🔁");
    expect(checkJavaVersionSpy).toHaveBeenCalledTimes(1);
    expect(checkJavaVersionSpy).toHaveBeenCalledWith(
      checkJavaVersion.handleJavaVersion
    );
  });

  it("should not check the java version if reacting any other emoji", () => {
    const checkJavaVersionSpy = jest.spyOn(checkJavaVersion, "getJavaVersion");
    checkJavaVersion.reactionOptions("💩");
    expect(checkJavaVersionSpy).not.toHaveBeenCalled();
  });
});
