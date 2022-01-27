import { User } from "discord.js";
import { BotProperties, clearBotProperties } from "../../settings/properties";
import GetApplicationInformation from "./getApplicationInformation";

const id = "test-id";
const owner = { id: "owner-id" } as User;

jest.mock("discord.js", () => {
  const discordJS = jest.createMockFromModule("discord.js") as any;
  discordJS.Client = class {
    application = {
      id,
      owner,
      partial: false,
    };
    users = {
      fetch: jest.fn(() => owner),
    };
    on() {}
  };
  return discordJS;
});

describe("State Get Application Information", () => {
  let getApplicationInformation: GetApplicationInformation;

  beforeEach(() => {
    clearBotProperties();
    getApplicationInformation = new GetApplicationInformation();
  });

  it("should get the application's Discord ID", async () => {
    await getApplicationInformation.next();
    expect(BotProperties.applicationId).toBe(id);
  });

  it("should get the bot's owner", async () => {
    await getApplicationInformation.next();
    expect(BotProperties.owner).toBe(owner);
  });

  it("should create an invite link", () => {
    const inviteLink =
      (BotProperties.inviteLink = `https://discord.com/api/oauth2/authorize?client_id=${id}&permissions=8&scope=bot`);
    expect(BotProperties.inviteLink).toBe(inviteLink);
  });
});
