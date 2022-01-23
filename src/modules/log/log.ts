import { existsSync, mkdirSync, createWriteStream, close, open } from "fs";
class Log {
  #creatingLogFile;
  #backLog: { now: Date; message: String }[];
  #stream: any;
  #currentFileName: string | null;
  static logger: Log;

  constructor() {
    this.#creatingLogFile = false;
    this.#backLog = [];
    this.#stream = null;
    this.#currentFileName = null;
    const logsFolder = `${process.cwd()}/logs`;
    if (!existsSync(logsFolder)) mkdirSync(logsFolder);
  }

  static getLog = () => {
    if (Log.logger === undefined) Log.logger = new Log();
    return Log.logger;
  };

  #log(message: string, now = new Date()) {
    const fileName = `logs/${now
      .toLocaleDateString()
      .toString()
      .replace(/\//g, "-")}.log`;
    try {
      if (this.#currentFileName !== fileName) {
        this.#stream = createWriteStream(fileName, {
          flags: "a",
        });
      }
      this.#backLog.push({ now, message });
      let constructedMessage = "";
      while (this.#backLog.length !== 0) {
        const { now, message } = this.#backLog.shift() as {
          now: Date;
          message: String;
        };
        constructedMessage += `[${now}] ${message}\n`;
      }
      this.#stream.write(constructedMessage);
    } catch (error: any) {
      if (error.code === "ENOENT")
        if (!this.#creatingLogFile) {
          this.#creatingLogFile = true;
          this.#currentFileName = fileName;
          close(this.#stream);
          open(fileName, "w", () => this.#log(message, now));
        } else this.#backLog.push({ now, message });
      else console.error(error);
    }
  }

  logError(message: string) {
    this.#log(`ERROR: ${message}`);
  }

  logWarning(message: string) {
    this.#log(`WARNING: ${message}`);
  }

  logInfo(message: string) {
    this.#log(`INFO: ${message}`);
  }
}

export default Log;
