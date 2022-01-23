import SetupState from "./setupState";
import fs from "fs";
import propertiesReader from "properties-reader";
import { BotProperties, ServerProperties } from "../../settings/properties";
import SetSeed from "./setSeed";
import CheckDomainName from "./checkDomainName";
import { Message } from "discord.js";
import request from "superagent";
import admZip from "adm-zip";

export default class CheckForWorld extends SetupState {
  description: string = "Checking for an existing world";
  serverPropertiesPath: string = "";

  next = async (): Promise<SetupState | undefined> => {
    const serverPath = `${process.cwd()}\\${
      ServerProperties.isJavaEdition ? "java" : "bedrock"
    }\\${ServerProperties.version}`;
    this.serverPropertiesPath = `${serverPath}\\server.properties`;
    if (!fs.existsSync(this.serverPropertiesPath))
      fs.writeFileSync(this.serverPropertiesPath, "");
    const properties = propertiesReader(this.serverPropertiesPath, "utf8", {
      saveSections: false,
    });
    const levelName = properties.get("level-name");
    if (
      levelName &&
      fs.existsSync(
        `${serverPath}\\${
          ServerProperties.isJavaEdition ? "" : "worlds\\"
        }${levelName}`
      )
    )
      return new CheckDomainName();
    else {
      this.createPromise();
      const content =
        "No world file was found. React with 🆕 to create a new world, or upload a zip of your world file's folder and send it to me.";
      this.reactionMessage = await BotProperties.owner?.send(content);
      this.bot.client.addListener("messageReactionAdd", this.handleReaction);
      this.bot.client.on("messageCreate", this.handleMessage);
      this.reactionMessage?.react("🆕");
      return this.responsePromise;
    }
  };

  reactionOptions = async (emoji: string) => {
    if (emoji === "🆕") {
      this.cleanupListeners();
      this.responseResolver?.(new SetSeed());
    }
  };

  handleMessage = async (message: Message) => {
    if (message.author.id === BotProperties.owner?.id) {
      const attachment = message.attachments.first();
      if (attachment && attachment.name?.endsWith(".zip")) {
        const fileName = attachment.name;
        if (fileName) {
          const file = fs.createWriteStream(fileName);
          const downloadURL = attachment.url;
          request
            .get(downloadURL)
            .on("error", () =>
              BotProperties.owner?.send(
                "There was an error when downloading your file. Maybe try again?"
              )
            )
            .pipe(file)
            .on("finish", () => {
              file.close();
              try {
                const serverFolder = `${process.cwd()}\\${
                  ServerProperties.isJavaEdition ? "java" : "bedrock"
                }\\${ServerProperties.version}${
                  ServerProperties.isJavaEdition ? "" : "\\worlds"
                }`;
                const zip = new admZip(fileName);
                zip.extractAllTo(`${serverFolder}`);
                fs.unlinkSync(fileName);
                const properties = propertiesReader(
                  this.serverPropertiesPath,
                  "utf8",
                  {
                    saveSections: false,
                  }
                );
                properties.set("level-name", fileName.slice(0, -4));
                properties.save(this.serverPropertiesPath);
                this.cleanupListeners();
                this.responseResolver?.(new CheckDomainName());
              } catch (error: any) {
                BotProperties.owner?.send(
                  "There was an error when extracting your file. Maybe try again?"
                );
              }
            });
        }
      }
    }
  };
}
