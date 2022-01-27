import { spawn } from "child_process";
import { readdirSync } from "fs";
import propertiesReader from "properties-reader";
import onExit from "signal-exit";
// import ps from "ps-node";
// import kill from "tree-kill";
// @ts-ignore
import NamedPipes from "named-pipes";
import Log from "../log/log";
import JavaHandler from "./handlers/javaHandler";
import BedrockHandler from "./handlers/bedrockHandler";

const logger = Log.getLog();
const properties = propertiesReader("settings.properties");
let pipeOutput = NamedPipes.listen("bedbot-pipe-output");
const isJavaEdition = properties.get("minecraft.isJavaEdition");
const serverHandler = isJavaEdition ? new JavaHandler() : new BedrockHandler();
let discordBot: any = null;
const folders = readdirSync(serverHandler.serversFolder, {
  withFileTypes: true,
})
  .filter((dirent) => dirent.isDirectory())
  .map((dirent) => dirent.name)
  .sort();
const newestFolder = folders[folders.length - 1];

type serverSettingFields =
  | "version"
  | "ipv4"
  | "ipv6"
  | "level"
  | "session"
  | "gamemode"
  | "difficulty";

const startServer = () => {
  let newServer;
  if (isJavaEdition) {
    newServer = spawn("java", ["-jar", "server.jar", "nogui"], {
      cwd: `${process.cwd()}\\java\\${newestFolder}`,
      windowsHide: true,
    });
  } else {
    newServer = spawn("bedrock_server.exe", {
      cwd: `bedrock\\${newestFolder}`,
      windowsHide: true,
    });
    // ps.lookup(
    //   {
    //     command: "bedrock_server.exe",
    //   },
    //   (err: any, resultList: any) => {
    //     if (err) throw new Error(err);
    //     if (resultList.length !== 0) {
    //       serverPID = resultList[0].pid;
    //     }
    //   }
    // );
  }
  newServer.stdout.setEncoding("utf8");
  newServer.stdout?.on("data", (data: any) => {
    if (data.indexOf("\n") !== -1) {
      const lines = data.split(/[\r\n]+/);
      lines.forEach((line: string, index: number) => {
        if (line.trim() !== "")
          serverHandler.handleData(
            `${line}${index !== lines.length - 1 ? "\n" : ""}`
          );
      });
    } else serverHandler.handleData(data);
  });
  newServer.on("exit", () => {
    serverHandler.sendError("Server Shutdown unexpectedly.");
    discordBot?.send("server", "shutdown");
    setTimeout(() => process.kill(process.pid, "SIGTERM"), 100); // Doesn't send signal if a timeout isn't set
  });
  return newServer;
};

let server = startServer();

pipeOutput.on("connect", async (client: any) => {
  discordBot = client;
  serverHandler.setDiscordBot(discordBot);
  serverHandler.sendInfo("Output Pipe Connected");
  serverHandler.sendSettings();
  // if (Object.keys(serverSettings).length === 7)
  discordBot?.send("settings", JSON.stringify(serverHandler.serverSettings));
  const pipeInput = await NamedPipes.connect("bedbot-pipe-input");
  pipeInput.on("data", (data: any) => {
    server?.stdin?.write(`${data}\n`);
  });
  pipeInput.on("get", (input: string) => {
    const { requestID, command } = JSON.parse(input);
    switch (command) {
      case "players":
        discordBot?.send(
          "get",
          JSON.stringify({ requestID, results: serverHandler.players })
        );
        break;
      case "ports":
        discordBot?.send(
          "get",
          JSON.stringify({
            requestID,
            results: {
              ipv4: serverHandler.serverSettings["ipv4"],
              ipv6: serverHandler.serverSettings["ipv6"],
            },
          })
        );
        break;
      default:
        const results =
          serverHandler.serverSettings[command as serverSettingFields];
        if (results)
          discordBot?.send("get", JSON.stringify({ requestID, results }));
        else serverHandler.sendWarning(`Unable to fetch data for ${command}`);
    }
  });
  pipeInput.on("run", (input: string) => {
    let { command, user, data } = JSON.parse(input);
    data = data.replace(/(\r\n|\n|\r)/gm, " "); // Prevents sneaky people from trying to execute other commands
    switch (command) {
      case "say":
        server?.stdin?.write(`say ${user}: ${data}\n`);
        break;
      default:
        server?.stdin?.write(`${command} ${data}\n`);
    }
  });
  pipeInput.on("shutdown", () => {
    logger.logInfo("SHUTTING DOWN");
    server?.stdin?.write("stop\n");
    setTimeout(() => process.kill(0), 1000);
  });
});

process.on("uncaughtException", (error: any) => logger.logError(error.stack));
process.on("unhandledRejection", (error: any) => logger.logError(error.stack));

const exit = () => {
  discordBot?.send("server", "process-shutdown");
  pipeOutput = undefined;
  // @TODO : Find a better way to stop the server.
  // This way works unless the server just booted, in which case it will finish loading before closing.
  server?.stdin?.write("stop\n");
};

onExit(exit);
