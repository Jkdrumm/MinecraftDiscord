const fs = require("fs");
class Log {
  #creatingLogFile;
  #backLog;
  #stream;
  #currentFileName;

  constructor() {
    this.#creatingLogFile = false;
    this.#backLog = [];
    this.#stream = null;
    this.#currentFileName = null;
  }

  #log(message, now = new Date()) {
    const fileName = `logs/${now
      .toLocaleDateString()
      .toString()
      .replace(/\//g, "-")}.log`;
    try {
      if (this.#currentFileName !== fileName) {
        this.#stream = fs.createWriteStream(fileName, {
          flags: "a",
        });
      }
      this.#backLog.push({ now, message });
      while (this.#backLog.length !== 0) {
        const { now, message } = this.#backLog.shift();
        this.#stream.write(`[${now}] ${message}\n`);
      }
    } catch (error) {
      if (error.code === "ENOENT")
        if (!this.#creatingLogFile) {
          this.#creatingLogFile = true;
          this.#currentFileName = fileName;
          fs.close(fs.open(fileName, "w")).then(() => log(message, now));
        } else this.#backLog.push({ now, message });
      else console.error(error);
    }
  }

  logError(message) {
    this.#log(`ERROR: ${message}`);
  }

  logWarning(message) {
    this.#log(`WARNING: ${message}`);
  }

  logInfo(message) {
    this.#log(`INFO: ${message}`);
  }

  logBacklog(data) {
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

module.exports = Log;
