import SetupState from "./setupState";
import { spawn } from "child_process";
import { BotProperties } from "../../settings/properties";
import CheckDownloadedServerVersion from "./checkDownloadedServerVersion";

export default class CheckJavaVersion extends SetupState {
  description: string = "Checking Java Version";

  next = async () => {
    this.createPromise();
    this.getJavaVersion(this.handleJavaVersion);
    return this.responsePromise;
  };

  handleJavaVersion = async (version?: string, error?: any) => {
    let content = "";
    if (version) {
      const majorVersion = Number(version.split(".")[0]);
      if (majorVersion !== NaN && majorVersion >= 16)
        return this.responseResolver?.(new CheckDownloadedServerVersion());
      else content = "Your Java version is out of date. ";
    } else content = "You do not have Java installed. ";
    if (error) content += `${error}\n`;
    content +=
      "Please download it here: https://www.oracle.com/java/technologies/downloads/\n";
    content +=
      "React with 🔁 once you have installed the new version of Java to continue the setup.";
    this.reactionMessage = await BotProperties.owner?.send(content);
    this.reactionMessage?.react("🔁");
  };

  getJavaVersion = (callback: (version?: string, error?: any) => void) => {
    const checkVersion = spawn("java", ["-version"]);
    checkVersion.on("error", function (err) {
      return callback(undefined, err);
    });
    let fullData = "";
    checkVersion.on("data", (data: string) => {
      fullData += data;
    });
    checkVersion.on("exit", () => {
      const data = fullData.toString().split("\n")[0];
      if (RegExp("java version").test(data)) {
        // Java is installed
        const javaVersion = data.split(" ")[2].replace(/"/g, "");
        callback(javaVersion);
      } else {
        // Java is not installed
        callback(undefined);
      }
    });
    return checkVersion;
  };

  reactionOptions = async (emoji: string) => {
    if (emoji === "🔁") {
      this.getJavaVersion(this.handleJavaVersion);
    }
  };
}
