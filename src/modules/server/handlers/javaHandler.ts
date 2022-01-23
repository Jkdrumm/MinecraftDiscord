import ServerHandler from "./serverHandler";

export default class JavaHandler extends ServerHandler {
  serversFolder = `${process.cwd()}\\java`;

  sendInfo(data: string) {
    if (!data.startsWith("Preparing spawn area:")) super.sendInfo(data);
  }

  processData(data: string) {
    const dataWords = data.split(" ");
    if (data.startsWith("UUID")) {
      const username = dataWords[3];
      const id = dataWords[5];
      this.players[id] = username;
      this.discordBot?.send("playerJoined", JSON.stringify({ id, username }));
    } else if (dataWords[1] === "left") {
      const username = dataWords[0];
      const id = this.findIdFromUsername(username);
      if (id) {
        delete this.players[id];
        this.discordBot?.send("playerDisconnected", id);
      } else
        this.logger.logWarning(
          `Unable to remove from player list: ${username}`
        );
    } else if (
      dataWords[0].startsWith("<") &&
      dataWords[0].endsWith(">") &&
      dataWords[1].toLowerCase() === "!link"
    ) {
      const username = dataWords[0].slice(1, -1);
      const id = this.findIdFromUsername(username);
      if (id && dataWords[2])
        this.discordBot?.send(
          "link",
          JSON.stringify({ id: id, token: dataWords[2], username })
        );
    } else if (data.startsWith("Starting minecraft server version"))
      this.serverSettings.version = dataWords[4];
    else if (data.startsWith("Starting Minecraft server on"))
      this.serverSettings.ipv4 = dataWords[4].split(":")[1];
    else if (data.startsWith("Preparing level"))
      this.serverSettings.level = data.slice(data.indexOf('"') + 1, -1);
    else if (data.startsWith("Default game type:"))
      this.serverSettings.gamemode =
        dataWords[3].charAt(0) + dataWords[3].substring(1).toLowerCase();
    else if (dataWords[0] === "Done") this.sendSettings();
  }

  handleData(data: string) {
    const endOutput = data.endsWith("\n");
    if (endOutput) {
      this.bufferedOutput += data;
      if (/^\[\d{2}(:\d{2}){2}][ ]/.test(this.bufferedOutput)) {
        // @ts-ignore
        const [time, type, ...outputWords] = data.split(/\s+(?![^\[]*\])/);
        this.sendData(outputWords.join(" "), this.getDataType(type));
      } else this.sendInfo(this.bufferedOutput.slice(0, -1));
      this.bufferedOutput = "";
    } else this.bufferedOutput += data;
  }

  getDataType(rawData: string) {
    return rawData.split("/")[1].slice(0, -2);
  }
}
