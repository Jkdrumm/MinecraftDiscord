import SetupState from "./setupState";
import {
  BotProperties,
  setUserProperties,
  userProperties,
  usersPropertiesPath,
} from "../../settings/properties";
import PropertiesReader from "properties-reader";
import CheckNotificationsSetup from "./checkNotificationsSetup";
import fs from "fs";

export default class LoadLinkedUsers extends SetupState {
  description: string = "Loading Linked Users";

  next = async () => {
    if (!fs.existsSync(usersPropertiesPath))
      fs.writeFileSync(usersPropertiesPath, "");
    setUserProperties(PropertiesReader("users.properties"));
    userProperties?.each(
      (key, value) => (BotProperties.linkedUsers[key] = value as string)
    );
    return new CheckNotificationsSetup();
  };
}
