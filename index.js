require("dotenv").config();
const util = require("minecraft-server-util");
const Discord = require("discord.js");
const ps = require("ps-node");
const fork = require("child_process").fork;
const onExit = require("signal-exit");
const propertiesReader = require("properties-reader");
const NamedPipes = require("named-pipes");
const Log = require("./src/log.js");
const fs = require("fs");

const emojis = ["❗", "1️⃣", "2️⃣", "3️⃣"];
const commands = {};
fs.readdirSync("./src/commands")
  .filter((file) => file.endsWith(".js"))
  .forEach((commandFile) => {
    const command = require(`./src/commands/${commandFile}`);
    if (command.prefix && command.run) {
      commands[command.prefix] = {
        run: command.run,
        permissionLevel: command.permissionLevel,
        description: command.description,
      };
    }
  });

const TOKEN = process.env.TOKEN;
const bot = new Discord.Client();
const logger = new Log();
const pipeInput = NamedPipes.listen("bedbot-pipe-input");
const properties = propertiesReader("settings.properties");

const serverCommands = {};
properties.each((key, value) => {
  if (key.startsWith("discord.command."))
    serverCommands[key.substring(16)] = value;
});

let server = null;
let backLog = [];
pipeInput.on("connect", (client) => {
  server = client;
  logger.logInfo("Input Pipe Connected");
  while (backLog.length !== 0) logger.logBacklog(backLog.shift());
});

const Status = Object.freeze({
  ONLINE: "Server is Online",
  OFFLINE: "Server is Offline",
  RESTARTING: "Server is Restarting...",
  HOSTNAME_PORT_ERROR: "ERROR: Check Port Forwarding or DNS Configuration",
});

const login = () =>
  bot.login(TOKEN).catch(() => {
    logger.logError("Unable to login. Retrying in 30 seconds.");
    setTimeout(login, 30000);
  });
login();

let freshBoot = true;
let displayedActivity = null;
let displayedNumPlayers = 0;
let rolesMessage = null;
bot.on("ready", () => {
  logger.logInfo(`Logged in as ${bot.user.tag}`);
  if (freshBoot) {
    displayedActivity = Status.OFFLINE;
    bot.user.setPresence({ status: "dnd", activity: { name: Status.OFFLINE } });
    freshBoot = false;
  } else {
    const message = "Internet connection was temporarily lost";
    logger.logWarning(message);
    sendMessage(message);
  }
  checkServerStatus();
  setupReactions();
});

const addReactions = (message, reactions) => {
  if (reactions.length !== 0) {
    message.react(reactions.shift());
    setTimeout(() => addReactions(message, reactions), 750);
  }
};

const getEmoji = (emojiName) =>
  bot.emojis.resolveID((emoji) => emoji.name === emojiName);

const setupReactions = () => {
  bot.channels.fetch(process.env.CHANNEL_ROLES_ID).then((channel) => {
    const reactionMessage =
      "Be notified when people are playing!" +
      "\nCustomize your notifications how you want" +
      "\n❗ = Be notified when anyone joins the server" +
      "\n1️⃣-9️⃣ = Be notified when there are this many players playing";
    channel.messages.fetch().then((messages) => {
      if (messages.size > 0) {
        messages.forEach((message) => {
          rolesMessage = message;
          message.edit(reactionMessage);
          addReactions(message, emojis);
        });
      } else
        channel.send(reactionMessage).then((message) => {
          rolesMessage = message;
          addReactions(rolesMessage, emojis);
        });
    });
  });
};

bot.on("disconnect", () => {
  logger.logError("Disconnected");
  login();
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
  else
    util
      .statusBedrock(process.env.SERVER_URL, {
        port: Number(process.env.SERVER_PORT),
        enableSRV: true,
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
    (err, resultList) => {
      if (err) throw new Error(err);
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

const setServerStatus = (currentActivity, currentNumPlayers = 0) => {
  if (displayedActivity !== currentActivity) {
    logger.logInfo(`Changing status to '${currentActivity}'`);
    displayedActivity = currentActivity;
    switch (currentActivity) {
      case Status.OFFLINE:
        bot.user.setPresence({
          status: "dnd",
          activity: { name: currentActivity },
        });
        sendMessage("Uh oh, the server is down");
        logger.logError("Server is down");
        break;
      case Status.RESTARTING:
        bot.user.setPresence({
          status: "idle",
          activity: { name: currentActivity },
        });
        sendMessage("Server is Restarting...");
        logger.logInfo("Server is Restarting...");
        break;
      case Status.HOSTNAME_PORT_ERROR:
        bot.user.setPresence({
          status: "dnd",
          activity: { name: currentActivity },
        });
        logger.logError(
          `Unable to reach server at ${process.env.SERVER_URL}:${process.env.SERVER_PORT}. Are your ports forwarded and is your DNS hostname configured correctly?`
        );
        break;
      default:
        bot.user.setPresence({
          status: "online",
          activity: { name: `${currentActivity} (${currentNumPlayers})` },
        });
        displayedNumPlayers = currentNumPlayers;
        sendMessage(`Hooray! The server has returned!`);
        logger.logInfo("Server returned");
    }
  } else if (
    currentActivity === Status.ONLINE &&
    displayedNumPlayers !== currentNumPlayers
  ) {
    bot.user.setActivity(`${currentActivity} (${currentNumPlayers})`);
    displayedNumPlayers = currentNumPlayers;
  }
};

const sendMessage = (message) =>
  bot.channels
    .fetch(process.env.CHANNEL_LOG_ID)
    .then((channel) =>
      channel
        .send(message)
        .catch((error) =>
          logger.logError(
            `${error} for sending messages to channel ${process.env.CHANNEL_LOG_ID}`
          )
        )
    );

const connectToServer = () => {
  let pipeOutput;
  try {
    pipeOutput = NamedPipes.connect("bedbot-pipe-output");
  } catch (error) {
    console.log(error);
  }
  pipeOutput.on("info", (data) => logger.logInfo(data));
  pipeOutput.on("warn", (warning) => logger.logWarning(warning));
  pipeOutput.on("error", (error) => logger.logError(error));
  pipeOutput.on("backlog", (data) => {
    if (server) logger.logBacklog(data);
    else backLog.push(data);
  });
  pipeOutput.on("numPlayers", (numPlayers) => {
    setServerStatus(Status.ONLINE, Number(numPlayers));
  });
  pipeOutput.on("get", (input) => {
    const { requestID, results } = JSON.parse(input);
    const { command, callback } = serverRequests.find(
      (request) => request.requestID === requestID
    );
    serverRequests.splice(
      serverRequests.indexOf({ requestID, command, callback }),
      1
    );
    if (commands[command]) callback(results);
    else logger.logError(`Unknown command '${command}'`);
  });
  pipeOutput.on("server", (event) => {
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

let serverRequests = [];
let requestID = 0;
const requestServerData = (command, callback) => {
  serverRequests.push({ requestID, command, callback });
  server.send("get", JSON.stringify({ requestID: requestID, command }));
  requestID++;
};

process.on("uncaughtException", (error) => {
  if (error.address !== "\\\\.\\pipe\\bedbot-pipe-output")
    logger.logError(error.stack.substring(7));
  else startServer();
});
process.on("unhandledRejection", (error) => {
  logger.logError(error.stack.substring(7));
});

onExit(() => {
  bot.user?.setPresence({ status: "invisible", activity: {} });
});
