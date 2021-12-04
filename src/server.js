const exec = require("child_process").exec;
const { readdirSync } = require("fs");
const propertiesReader = require("properties-reader");
const onExit = require("signal-exit");
const ps = require("ps-node");
const NamedPipes = require("named-pipes");

const properties = propertiesReader("settings.properties");
const pipeOutput = NamedPipes.listen("bedbot-pipe-output");
const serverFolders = properties.get("server.folders");
let discordBot = null;
const folders = readdirSync(serverFolders, {
  withFileTypes: true,
})
  .filter((dirent) => dirent.isDirectory())
  .map((dirent) => dirent.name)
  .sort();
const newestFolder = folders[folders.length - 1];

const serverSettings = [];
const players = [];
const processData = (data) => {
  if (data.startsWith("Player")) {
    const playerRawData = data.split(",");
    const playerObject = {
      username: playerRawData[0].substring(playerRawData[0].indexOf(":") + 2),
      xuid: playerRawData[1].substring(playerRawData[1].indexOf(":") + 2),
    };
    if (data.startsWith("Player connected")) players.push(playerObject);
    else if (data.startsWith("Player disconnected")) {
      let i = 0;
      while (
        i < players.length &&
        players[i].username !== playerObject.username &&
        players[i].xuid !== playerObject.xuid
      )
        i++;
      if (i < players.length) players.splice(i, 1);
      else
        sendWarning(
          `Unable to remove from player list: {username: ${playerObject.username}, xuid: ${playerObject.xuid}}`
        );
    }
    discordBot?.send("numPlayers", players.length);
  } else if (data.startsWith("Version"))
    serverSettings["version"] = data.substring(8);
  else if (data.startsWith("IPv4 supported, port:") && !serverSettings["ipv4"])
    serverSettings["ipv4"] = data.substring(22);
  else if (data.startsWith("IPv6 supported, port:") && !serverSettings["ipv6"])
    serverSettings["ipv6"] = data.substring(22);
  else if (data.startsWith("Level Name:"))
    serverSettings["level"] = data.substring(12);
  else if (data.startsWith("Session ID"))
    serverSettings["session"] = data.substring(11);
  else if (data.startsWith("Game mode:"))
    serverSettings["gamemode"] = data.substring(13);
  else if (data.startsWith("Difficulty:"))
    serverSettings["difficulty"] = data.substring(14);
  else if (data.startsWith("Server started."))
    discordBot?.send("settings", JSON.stringify(serverSettings));
};

const backLog = [];
const sendInfo = (data) => {
  if (data !== "Running AutoCompaction...") {
    processData(data);
    if (discordBot) discordBot.send("info", data);
    else backLog.push({ type: "info", now: new Date(), message: data });
  }
};

const sendWarning = (warning) => {
  if (discordBot) discordBot.send("warn", warning);
  else backLog.push({ type: "warn", now: new Date(), message: warning });
};

const sendError = (error) => {
  if (discordBot) discordBot.send("error", error);
  else backLog.push({ type: "error", now: new Date(), message: error });
};

let serverPID = null;
const startServer = () => {
  const newServer = exec(
    `"${serverFolders}\\${newestFolder}\\bedrock_server.exe"`,
    {
      windowsHide: true,
    }
  );
  discordBot?.send("numPlayers", players.length);
  newServer.on("exit", () => {
    sendError("Server Shutdown unexpectedly.");
    discordBot?.send("server", "shutdown");
    setTimeout(() => process.kill(process.pid, "SIGTERM"), 100); // Doesn't send signal if a timeout isn't set
  });
  ps.lookup(
    {
      command: "bedrock_server.exe",
    },
    (err, resultList) => {
      if (err) throw new Error(err);
      if (resultList.length !== 0) {
        serverPID = resultList[0].pid;
      }
    }
  );
  return newServer;
};

let server = startServer();

const sendData = (data, type) => {
  data = data.trim();
  if (type === "INFO") sendInfo(data);
  else if (type === "WARN") sendWarning(data);
  else {
    sendError(`Unknown type '${type}'`);
    sendError(data);
  }
};

const getType = (rawData, startOutput) =>
  rawData.substring(startOutput - 4, startOutput);

let bufferedOutput = "";
const handleData = (data) => {
  const startData = data.indexOf("[");
  //const startOutput = data.indexOf("]");
  const endOutput = data.endsWith("\n");
  if (endOutput) {
    bufferedOutput += data;
    if (bufferedOutput.startsWith("[")) {
      const startOutput = bufferedOutput.indexOf("]");
      sendData(
        bufferedOutput.slice(startOutput + 2, -1),
        getType(bufferedOutput, startOutput)
      );
    } else sendInfo(bufferedOutput.slice(0, -1));
    bufferedOutput = "";
  } else bufferedOutput += data;
  // if (startData === -1) {
  //   if (bufferedOutput) {
  //     bufferedOutput += data;
  //     if (bufferedOutput === "NO LOG FILE! - setting up server logging...") {
  //       bufferedOutput = null;
  //       return;
  //     }
  //     if (endOutput) {
  //       const combinedStartData = bufferedOutput.indexOf("[");
  //       if (combinedStartData !== -1) {
  //         const combinedStartOutput = bufferedOutput.indexOf("]");
  //         sendData(
  //           bufferedOutput.slice(combinedStartOutput + 2, -1),
  //           getType(bufferedOutput, combinedStartOutput)
  //         );
  //         bufferedOutput = null;
  //       }
  //     }
  //   } else {
  //     if (data !== "NO LOG FILE! - setting up server logging...")
  //       bufferedOutput = data;
  //   }
  // } else if (endOutput === -1) {
  //   if (bufferedOutput === null) bufferedOutput = data;
  //   else bufferedOutput = data + bufferedOutput;
  // } else sendData(data.slice(startOutput + 2, -1), getType(data, startOutput));
};

server.stdout.on("data", (data) => {
  if (data.indexOf("\n") !== -1) {
    const lines = data.split("\n");
    lines.forEach((line, index) => {
      if (line !== "")
        handleData(`${line}${index !== lines.length - 1 ? "\n" : ""}`);
    });
  } else handleData(data);
});

pipeOutput.on("connect", (client) => {
  discordBot = client;
  sendInfo("Output Pipe Connected");
  discordBot?.send("numPlayers", players.length);
  if (Object.keys(serverSettings).length === 7)
    discordBot?.send("settings", JSON.stringify(serverSettings));
  const pipeInput = NamedPipes.connect("bedbot-pipe-input");
  pipeInput.on("data", (data) => {
    server.stdin.write(`${data}\n`);
  });
  pipeInput.on("get", (input) => {
    const { requestID, command } = JSON.parse(input);
    switch (command) {
      case "players":
        discordBot?.send(
          "get",
          JSON.stringify({ requestID, results: players })
        );
        break;
      case "ports":
        discordBot?.send(
          "get",
          JSON.stringify({
            requestID,
            results: {
              ipv4: serverSettings["ipv4"],
              ipv6: serverSettings["ipv6"],
            },
          })
        );
        break;
      default:
        const results = serverSettings[command];
        if (results)
          discordBot?.send("get", JSON.stringify({ requestID, results }));
        else sendWarning(`Unable to fetch data for ${command}`);
    }
  });
  pipeInput.on("run", (input) => {
    let { command, user, data } = JSON.parse(input);
    data = data.replace(/(\r\n|\n|\r)/gm, " "); // Prevents sneaky people from trying to execute other commands
    switch (command) {
      case "say":
        server.stdin.write(`say ${user}: ${data}\n`);
        break;
      default:
        server.stdin.write(`${command} ${data}\n`);
    }
  });
  while (backLog.length !== 0) {
    const { type, now, message } = backLog.shift();
    discordBot.send("backlog", JSON.stringify({ type, now, message }));
  }
});

process.on("uncaughtException", (error) => sendError(error.stack));
process.on("unhandledRejection", (error) => sendError(error.stack));
sendInfo(newestFolder);

const exit = () => {
  discordBot?.send("server", "process-shutdown");
  server?.removeAllListeners();
  server?.kill();
  if (serverPID) process.kill(serverPID);
  console.log(serverPID);
};

onExit(exit);
