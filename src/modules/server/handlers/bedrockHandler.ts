import ServerHandler from "./serverHandler";

export default class BedrockHandler extends ServerHandler {
  serversFolder = `${process.cwd()}\\bedrock`;

  sendInfo(data: string) {
    if (data !== "Running AutoCompaction...") super.sendInfo(data);
  }

  processData(data: string) {
    if (data.startsWith("Player")) {
      const playerRawData = data.split(",");
      const username = playerRawData[0].substring(
        playerRawData[0].indexOf(":") + 2
      );
      const id = playerRawData[1].substring(playerRawData[1].indexOf(":") + 2);
      if (data.startsWith("Player connected")) {
        this.players[id] = username;
        this.discordBot?.send("playerJoined", JSON.stringify({ id, username }));
      } else {
        if (id) {
          delete this.players[id];
          this.discordBot?.send("playerDisconnected", id);
        } else
          this.logger.logWarning(
            `Unable to remove from player list: {username: ${username}, xuid: ${id}}`
          );
      }
    } else if (data.startsWith("Version"))
      this.serverSettings.version = data.substring(8);
    else if (
      data.startsWith("IPv4 supported, port:") &&
      !this.serverSettings.ipv4
    )
      this.serverSettings.ipv4 = data.substring(22);
    else if (
      data.startsWith("IPv6 supported, port:") &&
      !this.serverSettings.ipv6
    )
      this.serverSettings.ipv6 = data.substring(22);
    else if (data.startsWith("Level Name:"))
      this.serverSettings.level = data.substring(12);
    else if (data.startsWith("Session ID"))
      this.serverSettings.session = data.substring(11);
    else if (data.startsWith("Game mode:"))
      this.serverSettings.gamemode = data.substring(13);
    else if (data.startsWith("Difficulty:"))
      this.serverSettings.difficulty =
        data.charAt(14) + data.substring(15).toLowerCase();
    else if (data.startsWith("Server started.")) this.sendSettings();
  }

  handleData(data: string) {
    const endOutput = data.endsWith("\n");
    if (endOutput) {
      this.bufferedOutput += data;
      if (this.bufferedOutput.startsWith("[")) {
        const startOutput = this.bufferedOutput.indexOf("]");
        this.sendData(
          this.bufferedOutput.slice(startOutput + 2, -1),
          this.getDataType(this.bufferedOutput, startOutput)
        );
      } else this.sendInfo(this.bufferedOutput.slice(0, -1));
      this.bufferedOutput = "";
    } else this.bufferedOutput += data;
  }

  getDataType(rawData: string, startOutput: number) {
    return rawData.substring(startOutput - 4, startOutput);
  }
}
