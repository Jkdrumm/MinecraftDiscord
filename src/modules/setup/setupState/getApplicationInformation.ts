import SetupState from "./setupState";
import CheckPrimaryServer from "./checkPrimaryServer";
// import { User } from "discord.js";
import { BotProperties } from "../../settings/properties";

export default class GetApplicationInformation extends SetupState {
  description: string = "Getting application information";

  next = async () => {
    const application = this.bot.client.application?.partial
      ? await this.bot.client.application.fetch()
      : this.bot.client.application;
    if (application) {
      const { id, owner: applicationOwner } = application;
      BotProperties.applicationId = id;
      if (applicationOwner)
        BotProperties.owner = await this.bot.client.users.fetch(
          applicationOwner.id
        );
      BotProperties.inviteLink = `https://discord.com/api/oauth2/authorize?client_id=${BotProperties.applicationId}&permissions=8&scope=bot`;
      return new CheckPrimaryServer();
    } else {
      return Promise.reject("Unable to get Application Information");
    }
  };
}
