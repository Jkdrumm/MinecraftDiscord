import SetupState from "./setupState";
import CheckBotToken from "./checkBotToken";
import fs from "fs";
import propertiesReader from "properties-reader";
import { propertiesPath, setProperties } from "../../settings/properties";

export default class CheckPropertiesFileExists extends SetupState {
  description: string = "Loading the settings.properties file";

  next = async () => {
    if (!fs.existsSync(propertiesPath)) fs.writeFileSync(propertiesPath, "");
    setProperties(propertiesReader("settings.properties"));
    return new CheckBotToken();
  };
}
