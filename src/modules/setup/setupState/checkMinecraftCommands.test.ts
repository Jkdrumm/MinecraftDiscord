import PropertiesReader from "properties-reader";
import Permission from "../../../model/Permission";
import MinecraftCommands, {
  loadMinecraftCommands,
} from "../../command/minecraftCommands";
import Say from "../../command/minecraftCommands/say";
import Ban from "../../command/minecraftCommands/ban";
import { properties, setProperties } from "../../settings/properties";
import CheckMinecraftCommands from "./checkMinecraftCommands";

let propertiesCommands: { key: string; value: Permission }[] = [];

jest.mock("properties-reader", () => () => ({
  each: jest.fn((iterator: (key: string, value: string) => void) => {
    propertiesCommands.forEach(({ key, value }) => iterator(key, value));
  }),
  set: jest.fn(),
  save: jest.fn(),
}));

describe("State Check Minecraft Commands", () => {
  let checkMinecraftCommands: CheckMinecraftCommands;

  beforeAll(() => {
    setProperties(PropertiesReader("settings.properties"));
  });

  beforeEach(() => {
    loadMinecraftCommands();
    checkMinecraftCommands = new CheckMinecraftCommands();
  });

  it("should load saved permissions", async () => {
    propertiesCommands = [
      { key: "command.ban", value: Permission.user },
      { key: "command.say", value: Permission.owner },
    ];
    await checkMinecraftCommands.next();
    expect(MinecraftCommands.ban.permission).toBe(Permission.user);
    expect(MinecraftCommands.say.permission).toBe(Permission.owner);
  });

  it("should load defaults if not saved", async () => {
    propertiesCommands = [];
    expect(properties).not.toBeFalsy();
    if (properties) {
      const saveSpy = jest.spyOn(properties, "save");
      await checkMinecraftCommands.next();
      expect(saveSpy).toHaveBeenCalled();
    }
    expect(MinecraftCommands.ban.permission).toBe(new Ban().permission);
    expect(MinecraftCommands.say.permission).toBe(new Say().permission);
  });
});
