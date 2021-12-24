import { createWriteStream, close, open } from "fs";
class Log {
  #creatingLogFile;
  #backLog: { now: Date; message: String }[];
  #stream: any;
  #currentFileName: string | null;

  constructor() {
    this.#creatingLogFile = false;
    this.#backLog = [];
    this.#stream = null;
    this.#currentFileName = null;
  }

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
      while (this.#backLog.length !== 0) {
        const { now, message } = this.#backLog.shift() as {
          now: Date;
          message: String;
        };
        this.#stream.write(`[${now}] ${message}\n`);
      }
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

  logBacklog(data: string) {
    let { type, now, message } = JSON.parse(data);
    now = new Date(now);
    switch (type) {
      case "error":
        this.#log(`BACKLOG ERROR: ${message}`, now);
        break;
      case "warn":
        this.#log(`BACKLOG WARNING: ${message}`, now);
        break;
      default:
        this.#log(`BACKLOG INFO: ${message}`, now);
    }
  }
}

export default Log;
