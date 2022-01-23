import Log from "../../log/log";

export default abstract class ServerHandler {
  bufferedOutput: string;
  serverSettings: {
    version?: string;
    ipv4?: string;
    ipv6?: string;
    level?: string;
    session?: string;
    gamemode?: string;
    difficulty?: string;
  } = {};
  discordBot: any;
  logger: Log;
  players: { [id: string]: string };
  numPlayers: number;
  abstract serversFolder: string;

  constructor(discordBot?: any, logger: Log = Log.getLog()) {
    this.logger = logger;
    this.bufferedOutput = "";
    this.players = {};
    this.numPlayers = 0;
    if (discordBot) this.setDiscordBot(discordBot);
  }

  setDiscordBot(discordBot: any) {
    this.discordBot = discordBot;
  }

  sendInfo(data: string) {
    this.processData(data);
    this.discordBot?.send("info", data);
  }

  sendWarning(warning: string) {
    this.discordBot?.send("warn", warning);
  }

  sendError(error: string) {
    this.discordBot?.send("error", error);
  }

  sendData(data: string, type: string) {
    data = data.trim();
    if (type === "INFO") this.sendInfo(data);
    else if (type === "WARN") this.sendWarning(data);
    else {
      this.sendError(`Unknown type '${type}'`);
      this.sendError(data);
    }
  }

  sendSettings() {
    this.discordBot?.send("settings", JSON.stringify(this.serverSettings));
  }

  sendPlayers() {
    this.discordBot?.send("players", JSON.stringify(this.players));
  }

  findIdFromUsername(username: string) {
    return Object.keys(this.players).find(
      (uuid) => this.players[uuid] === username
    );
  }

  abstract processData(data: string): void;
  abstract handleData(data: string): void;
  abstract getDataType(rawData: string, startOutput: number): string;
}
