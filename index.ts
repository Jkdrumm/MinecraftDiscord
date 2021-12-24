require("dotenv").config();
import util from "minecraft-server-util";
import Discord, { TextChannel } from "discord.js";
import ps from "ps-node";
import { fork } from "child_process";
import onExit from "signal-exit";
import propertiesReader from "properties-reader";
// @ts-ignore
import NamedPipes from "named-pipes";
import Log from "./src/log";
import fs from "fs";

const emojis = ["❗", "1️⃣", "2️⃣", "3️⃣"];
const commands: any = {};
fs.readdirSync("./src/commands")
  .filter((file) => file.endsWith(".ts"))
  .forEach((commandFile) => {
    import(`./src/commands/${commandFile}`).then(
      ({ default: { prefix, permissionLevel, description, run } }) => {
        if (prefix && permissionLevel && run) {
          commands[prefix] = {
            run,
            permissionLevel,
            description,
          };
        }
      }
    );
  });

const bot = new Discord.Client();
const logger = new Log();
const pipeInput = NamedPipes.listen("bedbot-pipe-input");
const properties = propertiesReader("settings.properties");

const serverCommands: any = {};
properties.each((key, value) => {
  if (key.startsWith("discord.command."))
    serverCommands[key.substring(16)] = value;
});

let serverID = properties.getRaw("discord.server")?.toString();
let logChannel = properties.getRaw("discord.channel.log")?.toString();
let rolesChannel = properties.getRaw("discord.channel.roles")?.toString();

let serverURL = properties.getRaw("server.url")?.toString();
let serverPort = properties.get("server.port")?.toString();

let botToken = properties.getRaw("bot.token")?.toString();

let server: any = null;
let backLog: string[] = [];
pipeInput.on("connect", (client: any) => {
  server = client;
  logger.logInfo("Input Pipe Connected");
  while (backLog.length !== 0) logger.logBacklog(backLog.shift() as string);
});

const Status = Object.freeze({
  ONLINE: "Minecraft",
  OFFLINE: "Server is Offline",
  RESTARTING: "Server is Restarting...",
  HOSTNAME_PORT_ERROR: "ERROR: Check Port Forwarding or DNS Configuration",
});

const login = () => {
  if (botToken)
    bot.login(botToken).catch(() => {
      logger.logError("Unable to login. Retrying in 30 seconds.");
      setTimeout(login, 30000);
    });
};
login();

let freshBoot = true;
let displayedActivity: string | null = null;
let displayedNumPlayers = 0;
let rolesMessage = null;
bot.on("ready", () => {
  logger.logInfo(`Logged in as ${bot.user?.tag}`);
  if (freshBoot) {
    displayedActivity = Status.OFFLINE;
    bot.user?.setPresence({
      status: "dnd",
      activity: { name: Status.OFFLINE },
    });
    freshBoot = false;
  } else {
    const message = "Internet connection was temporarily lost";
    logger.logWarning(message);
    sendMessage(message);
  }
  checkServerStatus();
  setupReactions();
});

const addReactions = (message: any, reactions: any[]) => {
  if (reactions.length !== 0) {
    message.react(reactions.shift());
    setTimeout(() => addReactions(message, reactions), 750);
  }
};

// const getEmoji = (emojiName: any) =>
//   bot.emojis.resolveID((emoji: { name: any }) => emoji.name === emojiName);

const setupReactions = () => {
  if (rolesChannel)
    bot.channels.fetch(rolesChannel).then((channel: any) => {
      const reactionMessage =
        "Be notified when people are playing!" +
        "\nCustomize your notifications how you want" +
        "\n❗ = Be notified when anyone joins the server" +
        "\n1️⃣-9️⃣ = Be notified when there are this many players playing";
      channel.messages
        .fetch()
        .then(
          (messages: {
            size: number;
            forEach: (arg0: (message: any) => void) => void;
          }) => {
            if (messages.size > 0) {
              messages.forEach((message: { edit: (arg0: string) => void }) => {
                rolesMessage = message;
                message.edit(reactionMessage);
                addReactions(message, emojis);
              });
            } else
              channel.send(reactionMessage).then((message: any) => {
                rolesMessage = message;
                addReactions(rolesMessage, emojis);
              });
          }
        );
    });
};

bot.on("disconnect", () => {
  logger.logError("Disconnected");
  login();
});

bot.on("error", (error: any) => logger.logError(error.stack));

bot.on("reconnecting", (message) => {
  logger.logInfo(message);
});

bot.on("unhandledRejection", (error) => logger.logError(error.stack));
bot.on("uncaughtException", (error) => logger.logError(error.stack));

bot.on("message", (message) => {
  const content = message.content;
  if (!content.startsWith("!") || message.author.bot) return;
  const commandContent = content.substring(1).split(/[ ]+/);
  const commandName = commandContent[0].toLowerCase();
  logger.logInfo(
    `Parsing command \'${commandName}\' from user \'${message.author.username}\'`
  );
  const serverCommand = serverCommands[commandName];
  if (serverCommand)
    server.send(
      "run",
      JSON.stringify({
        command: commandName,
        user: message.author.username,
        data: content.substring(commandName.length + 2),
      })
    );
  else {
    const command = commands[commandName];
    if (command)
      if (commandName === "help") command.run(message, commands);
      else command.run(message, requestServerData);
    else if (commandName === "react") {
      emojis.forEach((emoji) => console.log(emojis.length));
      // rolesMessage.fetch().then((message) => {
      //   emojis.forEach((emoji) => console.log(emojis));
      // });
      // rolesMessage
      //   .fetch()
      //   .then((rolesMessage) =>
      //     rolesMessage.reactions.forEach((reaction) =>
      //       console.log(reaction.users)
      //     )
      //   );
    } else message.reply("Unknown command. Try asking for !help");
  }
});

const checkServerStatus = () => {
  if (server === null) connectToServer();
  else if (serverURL)
    util
      .statusBedrock(serverURL, {
        port: Number(serverPort),
        timeout: 1000,
      })
      .catch((error) => {
        // Server is not accesible from the Internet
        setServerStatus(Status.HOSTNAME_PORT_ERROR);
        setTimeout(checkServerStatus, 60000);
      });
};

const checkForLocalProcess = () => {
  logger.logInfo("Checking for local process");
  ps.lookup(
    {
      command: "bedrock_server.exe",
    },
    (error: any, resultList) => {
      if (error) throw new Error(error);
      if (resultList.length !== 0) {
        // Server is running OUTSIDE the wrapper. Shut 'em down, boys.
        resultList.forEach((serverInstance) =>
          process.kill(serverInstance.pid)
        );
      }
      startServer();
    }
  );
};

const startServer = () => {
  // Server is not running, attempt to start server
  server = null;
  setServerStatus(Status.RESTARTING);
  const serverWrapper = fork("src/server.js", {
    detached: true,
    stdio: "ignore",
  });
  serverWrapper.unref();
  setTimeout(connectToServer, 100);
};

const setServerStatus = (currentActivity: string, currentNumPlayers = 0) => {
  if (displayedActivity !== currentActivity) {
    logger.logInfo(`Changing status to '${currentActivity}'`);
    displayedActivity = currentActivity;
    switch (currentActivity) {
      case Status.OFFLINE:
        bot.user?.setPresence({
          status: "dnd",
          activity: { name: currentActivity },
        });
        sendMessage("Uh oh, the server is down");
        logger.logError("Server is down");
        break;
      case Status.RESTARTING:
        bot.user?.setPresence({
          status: "idle",
          activity: { name: currentActivity },
        });
        sendMessage("Server is Restarting...");
        logger.logInfo("Server is Restarting...");
        break;
      case Status.HOSTNAME_PORT_ERROR:
        bot.user?.setPresence({
          status: "dnd",
          activity: { name: currentActivity },
        });
        logger.logError(
          `Unable to reach server at ${serverURL}:${serverPort}. Are your ports forwarded and is your DNS hostname configured correctly?`
        );
        break;
      case Status.ONLINE:
      default:
        bot.user?.setPresence({
          status: "online",
          activity: {
            name: `${currentActivity}: ${currentNumPlayers}`,
          },
        });
        displayedNumPlayers = currentNumPlayers;
        sendMessage(`Hooray! The server has returned!`);
        logger.logInfo("Server returned");
    }
  } else if (
    currentActivity === Status.ONLINE &&
    displayedNumPlayers !== currentNumPlayers
  ) {
    bot.user?.setActivity(`${currentActivity}: ${currentNumPlayers}`);
    displayedNumPlayers = currentNumPlayers;
  }
};

const sendMessage = (message: string) => {
  if (logChannel)
    (bot.channels.cache.get(logChannel) as TextChannel)
      .send(message)
      .catch((error: any) =>
        logger.logError(
          `${error} for sending messages to channel ${logChannel}`
        )
      );
};

const connectToServer = () => {
  let pipeOutput;
  try {
    pipeOutput = NamedPipes.connect("bedbot-pipe-output");
  } catch (error) {
    console.log(error);
  }
  pipeOutput.on("info", (data: string) => logger.logInfo(data));
  pipeOutput.on("warn", (warning: string) => logger.logWarning(warning));
  pipeOutput.on("error", (error: string) => logger.logError(error));
  pipeOutput.on("backlog", (data: string) => {
    if (server) logger.logBacklog(data);
    else backLog.push(data);
  });
  pipeOutput.on("numPlayers", (numPlayers: any) => {
    setServerStatus(Status.ONLINE, Number(numPlayers));
  });
  pipeOutput.on("get", (input: string) => {
    if (serverRequests.length) {
      const { requestID, results } = JSON.parse(input);
      const { command, callback } = serverRequests.find(
        (request) => request.requestID === requestID
      ) as { requestID: number; command: string; callback: any };
      serverRequests.splice(
        serverRequests.indexOf({ requestID, command, callback }),
        1
      );
      if (commands[command]) callback(results);
      else logger.logError(`Unknown command '${command}'`);
    } else
      logger.logError(`Attempted request callback when request list empty`);
  });
  pipeOutput.on("server", (event: string) => {
    console.log("Got: " + event);
    switch (event) {
      case "start":
        setServerStatus(Status.ONLINE);
        break;
      case "shutdown":
      // Server script is still running, but the server crashed. Server script will handle restarting
      // break;
      case "process-shutdown":
        setTimeout(() => {
          console.log("RESTARTING LMAOOOO");
          // Server script is shutting down. Restart the server script
          startServer();
        }, 1000);
    }
  });
  server = pipeOutput;
};

let serverRequests: { requestID: number; command: string; callback: any }[] =
  [];
let requestID = 0;
const requestServerData = (command: any, callback: any) => {
  serverRequests.push({ requestID, command, callback });
  server.send("get", JSON.stringify({ requestID: requestID, command }));
  requestID++;
};

process.on("uncaughtException", (error: any) => {
  if (error.address !== "\\\\.\\pipe\\bedbot-pipe-output")
    logger.logError(error.stack.substring(7));
  else startServer();
});
process.on("unhandledRejection", (error: any) => {
  logger.logError(error.stack.substring(7));
});

onExit(() => {
  console.log("Exiting");
  bot.user?.setPresence({ status: "invisible", activity: {} });
});
