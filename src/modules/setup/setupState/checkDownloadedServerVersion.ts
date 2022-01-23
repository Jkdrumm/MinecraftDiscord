import SetupState from "./setupState";
import fs, { readdirSync } from "fs";
import path from "path";
import { ServerProperties } from "../../settings/properties";
import CheckMinecraftCommands from "./checkMinecraftCommands";
import axios from "axios";
import request from "superagent";
import admZip from "adm-zip";

export default class CheckDownloadedServerVersion extends SetupState {
  description: string = "Checking server versions";

  next = async () => {
    const serversFolder = `${process.cwd()}\\${
      ServerProperties.isJavaEdition ? "java" : "bedrock"
    }`;
    if (!fs.existsSync(serversFolder)) fs.mkdirSync(serversFolder);
    const folders = readdirSync(serversFolder, {
      withFileTypes: true,
    })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name)
      .sort();
    let currentVersion: string = "";
    let version_sha1: string = "";
    if (folders.length >= 1) currentVersion = folders[folders.length - 1];
    // Check the newest server version
    let newestVersion: string;
    if (ServerProperties.isJavaEdition) {
      const versionsURL =
        "https://launchermeta.mojang.com/mc/game/version_manifest_v2.json";
      let versionResponse = await (
        await axios.get(versionsURL, { headers: { "content-type": "json" } })
      ).data;
      newestVersion = versionResponse.latest.release;
      version_sha1 = versionResponse.versions.find(
        (version: { id: string }) => version.id === newestVersion
      ).sha1;
    } else {
      let response = await (
        await axios.get(
          "https://www.minecraft.net/en-us/download/server/bedrock"
        )
      ).data;
      const versionStartText = "bedrock-server-";
      const versionEndText = ".zip";
      response = response.substring(
        response.indexOf(versionStartText) + versionStartText.length
      );
      newestVersion = response.substring(0, response.indexOf(versionEndText));
    }
    if (currentVersion !== newestVersion) {
      // Download the newest version!
      ServerProperties.version = newestVersion;
      if (ServerProperties.isJavaEdition) {
        const versionURL = `https://launchermeta.mojang.com/v1/packages/${version_sha1}/${newestVersion}.json`;
        let versionURLResponse = await (
          await axios.get(versionURL, { headers: { "content-type": "json" } })
        ).data;
        const downloadURL = versionURLResponse.downloads.server.url;
        fs.mkdirSync(`${serversFolder}/${newestVersion}`);
        const fileName = `${serversFolder}/${newestVersion}/server.jar`;
        const file = fs.createWriteStream(fileName);
        return await new Promise<SetupState>((resolve, reject) => {
          request
            .get(downloadURL)
            .on("error", (error: any) => reject(error))
            .pipe(file)
            .on("finish", () => {
              file.close();
              resolve(new CheckMinecraftCommands());
            });
        });
      } else {
        const fileName = `${serversFolder}/${newestVersion}.zip`;
        const file = fs.createWriteStream(fileName);
        const downloadURL = `https://minecraft.azureedge.net/bin-win/bedrock-server-${newestVersion}.zip`;
        return await new Promise<SetupState>((resolve, reject) => {
          request
            .get(downloadURL)
            .on("error", (error: any) => reject(error))
            .pipe(file)
            .on("finish", () => {
              file.close();
              try {
                const zip = new admZip(fileName);
                zip.extractAllTo(`${serversFolder}/${newestVersion}`);
                fs.unlinkSync(fileName);
                if (currentVersion !== "") {
                  this.copyFolders(
                    ["worlds"],
                    serversFolder,
                    currentVersion,
                    newestVersion
                  );
                  this.copyFiles(
                    ["permissions.json", "server.properties", "whitelist.json"],
                    serversFolder,
                    currentVersion,
                    newestVersion
                  );
                }
              } catch (error: any) {
                reject(error);
              }
              resolve(new CheckMinecraftCommands());
            });
        });
      }
    }
    ServerProperties.version = currentVersion;
    return new CheckMinecraftCommands();
  };

  copyFolders = (
    folderNames: string[],
    serversFolder: string,
    currentVersion: string,
    newestVersion: string
  ) => {
    folderNames.forEach((folder) =>
      this.copyFolderRecursiveSync(
        `${serversFolder}/${currentVersion}/${folder}`,
        `${serversFolder}/${newestVersion}`
      )
    );
  };

  copyFiles = (
    fileNames: string[],
    serversFolder: string,
    currentVersion: string,
    newestVersion: string
  ) => {
    fileNames.forEach((file) =>
      this.copyFileSync(
        `${serversFolder}/${currentVersion}/${file}`,
        `${serversFolder}/${newestVersion}/${file}`
      )
    );
  };

  copyFileSync = (source: string, target: string) => {
    let targetFile = target;

    // If target is a directory, a new file with the same name will be created
    if (fs.existsSync(target))
      if (fs.lstatSync(target).isDirectory())
        targetFile = path.join(target, path.basename(source));

    fs.writeFileSync(targetFile, fs.readFileSync(source));
  };

  copyFolderRecursiveSync = (source: string, target: string) => {
    // Check if folder needs to be created or integrated
    let targetFolder = path.join(target, path.basename(source));
    if (!fs.existsSync(targetFolder)) fs.mkdirSync(targetFolder);

    // Copy
    if (fs.lstatSync(source).isDirectory()) {
      fs.readdirSync(source).forEach((file) => {
        let curSource = path.join(source, file);
        if (fs.lstatSync(curSource).isDirectory())
          this.copyFolderRecursiveSync(curSource, targetFolder);
        else this.copyFileSync(curSource, targetFolder);
      });
    }
  };
}
