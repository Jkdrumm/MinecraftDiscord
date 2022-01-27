import CheckServerRunning from "./checkServerRunning";
import child_process from "child_process";
import { Message, User } from "discord.js";
import { BotProperties, ServerProperties } from "../../settings/properties";
import Edition from "../../../model/Edition";
import MinecraftCommands, {
  loadMinecraftCommands,
} from "../../command/minecraftCommands";
import Commands, { loadCommands } from "../../command/commands";

jest.mock("child_process", () => {
  const mock = jest.createMockFromModule("child_process") as any;
  mock.spawn = () => ({ unref: jest.fn() });
  return mock;
});

jest.mock("named-pipes", () => ({
  listen: () => ({ on: jest.fn() }),
  connect: { on: jest.fn() },
}));

describe("State Check Server Running", () => {
  let checkServerRunning: CheckServerRunning;

  beforeEach(() => {
    checkServerRunning = new CheckServerRunning();
    ServerProperties.server = { send: jest.fn() };
    loadCommands();
    loadMinecraftCommands();
  });

  it("should start the server", () => {
    const spawnSpy = jest.spyOn(child_process, "spawn");
    jest.useFakeTimers();
    checkServerRunning.startServer();
    expect(spawnSpy).toHaveBeenCalled();
  });

  it("should run each bot command for Java Edition", async () => {
    ServerProperties.isJavaEdition = true;
    for (const commandName of Object.keys(Commands)) {
      const command = Commands[commandName];
      if (command.edition !== Edition.bedrock) {
        const isShutdown = command.prefix === "shutdown";
        const message = {
          client: checkServerRunning.bot.client,
          reply: jest.fn(),
        } as unknown as Message;
        message.content = `!${command.prefix}`;
        message.author = { client: checkServerRunning.bot.client } as User;
        let spy: any;
        if (!isShutdown) spy = jest.spyOn(command, "run");
        else spy = jest.spyOn(ServerProperties.server, "send");
        const logInfoSpy = jest.spyOn(checkServerRunning.logger, "logInfo");
        await checkServerRunning.handleMessage(message);
        expect(logInfoSpy).toHaveBeenLastCalledWith(
          expect.stringContaining(command.prefix.toLowerCase())
        );
        if (!isShutdown) expect(spy).toHaveBeenCalled();
        else expect(spy).toHaveBeenLastCalledWith("shutdown", "");
      }
    }
  });

  it("should run each bot command for Bedrock Edition", async () => {
    ServerProperties.isJavaEdition = false;
    for (const commandName of Object.keys(Commands)) {
      const command = Commands[commandName];
      if (command.edition !== Edition.java) {
        const isShutdown = command.prefix === "shutdown";
        const message = {
          client: checkServerRunning.bot.client,
          reply: jest.fn(),
          content: `!${command.prefix}`,
          author: { client: checkServerRunning.bot.client } as User,
        } as unknown as Message;
        let spy: any;
        if (!isShutdown) spy = jest.spyOn(command, "run");
        else spy = jest.spyOn(ServerProperties.server, "send");
        const logInfoSpy = jest.spyOn(checkServerRunning.logger, "logInfo");
        await checkServerRunning.handleMessage(message);
        expect(logInfoSpy).toHaveBeenLastCalledWith(
          expect.stringContaining(command.prefix.toLowerCase())
        );
        if (!isShutdown) expect(spy).toHaveBeenCalled();
        else expect(spy).toHaveBeenLastCalledWith("shutdown", "");
      }
    }
  });

  it("should run each server command for Java Edition", async () => {
    ServerProperties.isJavaEdition = true;
    const owner = { client: checkServerRunning.bot.client } as User;
    owner.id = "owner-id";
    BotProperties.owner = owner;
    for (const commandName of Object.keys(MinecraftCommands)) {
      const command = MinecraftCommands[commandName];
      if (command.edition !== Edition.bedrock) {
        const message = {
          client: checkServerRunning.bot.client,
          reply: jest.fn(),
        } as unknown as Message;
        message.content = `!${command.prefix}`;
        message.author = owner;
        message.author.id = owner.id;
        const sendSpy = jest.spyOn(ServerProperties.server, "send");
        const logInfoSpy = jest.spyOn(checkServerRunning.logger, "logInfo");
        await checkServerRunning.handleMessage(message);
        expect(logInfoSpy).toHaveBeenLastCalledWith(
          expect.stringContaining(command.prefix.toLowerCase())
        );
        expect(sendSpy).toHaveBeenCalled();
      }
    }
  });

  it("should run each server command for Bedrock Edition", async () => {
    ServerProperties.isJavaEdition = false;
    const owner = { client: checkServerRunning.bot.client } as User;
    owner.id = "owner-id";
    BotProperties.owner = owner;
    for (const commandName of Object.keys(MinecraftCommands)) {
      const command = MinecraftCommands[commandName];
      if (command.edition !== Edition.java) {
        const message = {
          client: checkServerRunning.bot.client,
          reply: jest.fn(),
        } as unknown as Message;
        message.content = `!${command.prefix}`;
        message.author = owner;
        message.author.id = owner.id;
        const sendSpy = jest.spyOn(ServerProperties.server, "send");
        const logInfoSpy = jest.spyOn(checkServerRunning.logger, "logInfo");
        await checkServerRunning.handleMessage(message);
        expect(logInfoSpy).toHaveBeenLastCalledWith(
          expect.stringContaining(command.prefix.toLowerCase())
        );
        expect(sendSpy).toHaveBeenCalled();
      }
    }
  });

  it("should let the user know to ask for help if entering a command that doesn't exist", async () => {
    ServerProperties.isJavaEdition = false;
    const owner = { client: checkServerRunning.bot.client } as User;
    owner.id = "owner-id";
    BotProperties.owner = owner;
    const message = {
      client: checkServerRunning.bot.client,
      reply: jest.fn(),
    } as unknown as Message;
    message.content = `!garbled-mess-this-command-don-exits`;
    message.author = owner;
    message.author.id = owner.id;
    const replySpy = jest.spyOn(message, "reply");
    await checkServerRunning.handleMessage(message);
    expect(replySpy).toHaveBeenCalledWith(expect.stringContaining("!help"));
  });

  // it("Should connect to the server pipe if the server is already running", () => {});
});
