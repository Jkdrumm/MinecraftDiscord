// @ts-ignore
import NamedPipes from "named-pipes";
// import util from "minecraft-server-util";
import Commands, { loadCommands } from "../../command/commands";
import Log from "../../log/log";
import {
  BotProperties,
  ServerProperties,
  userProperties,
  usersPropertiesPath,
} from "../../settings/properties";
import SetupState from "./setupState";
import { spawn } from "child_process";
import BotStatus from "../../../model/BotStatus";
import { Message, TextChannel } from "discord.js";
import Permission from "../../../model/Permission";
import MinecraftCommands from "../../command/minecraftCommands";

const emojis = ["❗", "1️⃣", "2️⃣", "3️⃣"];

export default class CheckServerRunning extends SetupState {
  description: string = "Checking if the server is already running";
  logger = Log.getLog();
  serverRequests: { requestID: number; command: string; callback: any }[] = [];
  requestID: number = 0;
  rolesMessage: { edit: (arg0: string) => void } | null = null;
  displayedActivity: string = BotStatus.OFFLINE;
  displayedNumPlayers = 0;
  pipeInput: any;
  attemptedStart = false;

  next = async () => {
    loadCommands();
    process.removeAllListeners("uncaughtException");
    process.on("uncaughtException", (error: any) => {
      if (error.address !== "\\\\.\\pipe\\bedbot-pipe-output")
        this.logger.logError(error.stack.substring(7));
      else this.startServer();
    });
    this.pipeInput = NamedPipes.listen("bedbot-pipe-input");
    this.pipeInput.on("connect", (client: any) => {
      // this.checkServerStatus();
      ServerProperties.server = client;
      this.responseResolver?.(undefined);
    });
    this.connectToServer();
    this.createPromise();
    this.bot.client.on("messageCreate", this.handleMessage);
    return this.responsePromise;
  };

  handleMessage = async (message: Message) => {
    const content = message.content;
    if (!content.startsWith("!") || message.author.bot) return;
    const commandContent = content.substring(1).split(/[ ]+/);
    const commandName = commandContent[0].toLowerCase();
    this.logger.logInfo(
      `Parsing command \'${commandName}\' from user \'${message.author.username}\'`
    );
    const serverCommand = MinecraftCommands[commandName];
    if (serverCommand) {
      if (
        message.author.id === BotProperties.owner?.id ||
        serverCommand.permission === Permission.user
      )
        ServerProperties.server.send(
          "run",
          JSON.stringify({
            command: commandName,
            user: message.author.username,
            data: content.substring(commandName.length + 2),
          })
        );
    } else {
      const command = Commands[commandName];
      if (command) {
        if (
          message.author.id === BotProperties.owner?.id ||
          command.permission === Permission.user
        )
          if (commandName === "help" || commandName === "helpcommands")
            command.run(message);
          else if (commandName === "shutdown") {
            this.bot.client.user?.setPresence({ status: "invisible" });
            ServerProperties.server.send("shutdown", "");
            setTimeout(() => process.kill(0), 1000);
          } else command.run(message, this.requestServerData);
      } else message.reply("Unknown command. Try asking for !help");
    }
  };

  requestServerData = (command: any, callback: any) => {
    this.serverRequests.push({ requestID: this.requestID, command, callback });
    ServerProperties.server.send(
      "get",
      JSON.stringify({ requestID: this.requestID, command })
    );
    this.requestID++;
  };

  checkServerStatus = () => {
    if (!ServerProperties.server) this.connectToServer();
    // else if (ServerProperties.serverURL)
    //   if (!ServerProperties.isJavaEdition)
    //     util
    //       .statusBedrock(ServerProperties.serverURL, {
    //         port: Number(ServerProperties.serverPort),
    //         timeout: 1000,
    //       })
    //       .catch(() => {
    //         // Server is not accesible from the Internet
    //         this.setServerStatus(BotStatus.HOSTNAME_PORT_ERROR);
    //         setTimeout(this.checkServerStatus, 60000);
    //       });
  };

  startServer = () => {
    if (!this.attemptedStart) {
      // Server is not running, attempt to start server
      ServerProperties.server = undefined;
      this.setServerStatus(BotStatus.RESTARTING);
      const serverWrapper =
        process.env.NODE_ENV === "production"
          ? spawn("server", {
              detached: true,
              stdio: "ignore",
            })
          : spawn("ts-node", ["src/modules/server/server.ts"], {
              detached: true,
              stdio: "ignore",
            });
      serverWrapper.unref();
      this.attemptedStart = true;
    }
    setTimeout(() => this.connectToServer(), 1000);
  };

  connectToServer = async () => {
    let pipeOutput;
    try {
      pipeOutput = await NamedPipes.connect("bedbot-pipe-output");
    } catch (error: any) {
      this.logger.logError(error);
    }
    pipeOutput.on("info", (data: string) => this.logger.logInfo(data));
    pipeOutput.on("warn", (warning: string) => this.logger.logWarning(warning));
    pipeOutput.on("error", (error: string) => this.logger.logError(error));
    pipeOutput.on("settings", (data: string) => {
      const { players, settings } = JSON.parse(data);
      this.setServerStatus(BotStatus.ONLINE, Object.keys(players).length);
      ServerProperties.players = players;
      ServerProperties.settings = settings;
    });
    pipeOutput.on("players", (data: string) => {
      const players = JSON.parse(data);
      this.setServerStatus(BotStatus.ONLINE, Object.keys(players).length);
      ServerProperties.players = players;
    });
    pipeOutput.on("playerJoined", (data: string) => {
      const { id, username } = JSON.parse(data);
      // const linkedDiscordId = Object.keys(BotProperties.linkedUsers).find(
      //   (discordId) => BotProperties.linkedUsers[discordId] === id
      // );
      ServerProperties.players[id] = username;
      const numPlayers = Object.keys(ServerProperties.players).length;
      this.setServerStatus(BotStatus.ONLINE, numPlayers);
      const joinedDiscordId = Object.keys(BotProperties.linkedUsers).find(
        (discordId) => BotProperties.linkedUsers[discordId] === id
      );
      const onlyOnePlayer = numPlayers === 1;
      // Notify each user as long as they are not currently playing
      BotProperties.notifyUsers["every"]?.forEach((discordId) => {
        if (
          ServerProperties.players[BotProperties.linkedUsers[discordId]] ===
          undefined
        ) {
          const content = `${username} ${
            joinedDiscordId ? `(<@${joinedDiscordId}>) ` : ""
          }is now playing Minecraft. There ${
            onlyOnePlayer ? "is" : "are"
          } currently ${numPlayers} player${onlyOnePlayer ? "" : "s"}.`;
          this.bot.client.users.cache.get(discordId)?.send(content);
        }
      });
      BotProperties.notifyUsers[numPlayers]?.forEach((discordId) => {
        if (
          ServerProperties.players[BotProperties.linkedUsers[discordId]] ===
          undefined
        ) {
          const content = `There ${
            onlyOnePlayer ? "is" : "are"
          } ${numPlayers} playing Minecraft right now.`;
          this.bot.client.users.cache.get(discordId)?.send(content);
        }
      });
    });
    pipeOutput.on("playerDisconnected", (id: string) => {
      delete ServerProperties.players[id];
      this.setServerStatus(
        BotStatus.ONLINE,
        Object.keys(ServerProperties.players).length
      );
    });
    pipeOutput.on("get", (input: string) => {
      if (this.serverRequests.length) {
        const { requestID, results } = JSON.parse(input);
        const { command, callback } = this.serverRequests.find(
          (request) => request.requestID === requestID
        ) as { requestID: number; command: string; callback: any };
        this.serverRequests.splice(
          this.serverRequests.indexOf({ requestID, command, callback }),
          1
        );
        if (Commands[command]) callback(results);
        else this.logger.logError(`Unknown command '${command}'`);
      } else
        this.logger.logError(
          `Attempted request callback when request list empty`
        );
    });
    pipeOutput.on("server", (event: string) => {
      switch (event) {
        case "start":
          this.setServerStatus(BotStatus.ONLINE);
          break;
        case "shutdown":
        // Server script is still running, but the server crashed. Server script will handle restarting
        // break;
        case "process-shutdown":
          setTimeout(() => {
            // Server script is shutting down. Restart the server script
            this.startServer();
          }, 1000);
      }
    });
    pipeOutput.on("link", async (data: string) => {
      const { id, token, username } = JSON.parse(data);
      const discordId = Object.keys(BotProperties.unlinkedUsers).find(
        (key) => BotProperties.unlinkedUsers[key] === token
      );
      if (discordId) {
        BotProperties.linkedUsers[discordId] = id;
        delete BotProperties.unlinkedUsers[id];
        userProperties?.set(discordId, id);
        await userProperties?.save(usersPropertiesPath);
        let content = `Account successfully linked to Minecraft user ${username} with uuid ${id}.\n`;
        content = `You may now go back to <#${BotProperties.notificationMessage?.channelId}> to setup your notifications\n`;
        content += `If this is an error, please contact your Minecraft server's host <@${BotProperties.owner?.id}>`;
        this.bot.client.users.cache.get(discordId)?.send(content);
      } else {
      }
    });
    ServerProperties.server = pipeOutput;
  };

  // checkForLocalProcess = () => {
  //   this.logger.logInfo("Checking for local process");
  //   ps.lookup(
  //     {
  //       command: "bedrock_server.exe",
  //     },
  //     (error: any, resultList) => {
  //       if (error) throw new Error(error);
  //       if (resultList.length !== 0) {
  //         // Server is running OUTSIDE the wrapper. Shut 'em down, boys.
  //         resultList.forEach((serverInstance) =>
  //           process.kill(serverInstance.pid)
  //         );
  //       }
  //       this.startServer();
  //     }
  //   );
  // };

  setServerStatus = (currentActivity: string, currentNumPlayers = 0) => {
    if (this.displayedActivity !== currentActivity) {
      this.displayedActivity = currentActivity;
      switch (currentActivity) {
        case BotStatus.OFFLINE:
          this.bot.client.user?.setPresence({
            status: "dnd",
            activities: [{ name: currentActivity }],
          });
          this.sendMessage("Uh oh, the server is down");
          this.logger.logError("Server is down");
          break;
        case BotStatus.RESTARTING:
          this.bot.client.user?.setPresence({
            status: "idle",
            activities: [{ name: currentActivity }],
          });
          this.sendMessage("Server is Restarting...");
          this.logger.logInfo("Server is Restarting...");
          break;
        case BotStatus.HOSTNAME_PORT_ERROR:
          this.bot.client.user?.setPresence({
            status: "dnd",
            activities: [{ name: currentActivity }],
          });
          // this.logger.logError(
          //   `Unable to reach server at ${ServerProperties.serverURL}:${ServerProperties.serverPort}. Are your ports forwarded and is your DNS hostname configured correctly?`
          // );
          break;
        case BotStatus.ONLINE:
        default:
          this.bot.client.user?.setPresence({
            status: "online",
            activities: [
              {
                name: `${currentActivity}: ${currentNumPlayers}`,
              },
            ],
          });
          this.displayedNumPlayers = currentNumPlayers;
          this.sendMessage(`Hooray! The server has returned!`);
          this.logger.logInfo("Server returned");
      }
    } else if (
      currentActivity === BotStatus.ONLINE &&
      this.displayedNumPlayers !== currentNumPlayers
    ) {
      this.bot.client.user?.setActivity(
        `${currentActivity}: ${currentNumPlayers}`
      );
      this.displayedNumPlayers = currentNumPlayers;
    }
  };

  sendMessage = (message: string) => {
    if (ServerProperties.logChannel)
      (
        this.bot.client.channels.cache.get(
          ServerProperties.logChannel
        ) as TextChannel
      )
        .send(message)
        .catch((error: any) =>
          this.logger.logError(
            `${error} for sending messages to channel ${ServerProperties.logChannel}`
          )
        );
  };

  setupReactions = () => {
    if (ServerProperties.rolesChannel)
      this.bot.client.channels
        .fetch(ServerProperties.rolesChannel)
        .then((channel: any) => {
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
                  messages.forEach(
                    (message: { edit: (arg0: string) => void }) => {
                      this.rolesMessage = message;
                      message.edit(reactionMessage);
                      this.addReactions(message, emojis);
                    }
                  );
                } else
                  channel.send(reactionMessage).then((message: any) => {
                    this.rolesMessage = message;
                    this.addReactions(this.rolesMessage, emojis);
                  });
              }
            );
        });
  };

  addReactions = (message: any, reactions: any[]) => {
    if (reactions.length !== 0) {
      message.react(reactions.shift());
      setTimeout(() => this.addReactions(message, reactions), 750);
    }
  };
}
