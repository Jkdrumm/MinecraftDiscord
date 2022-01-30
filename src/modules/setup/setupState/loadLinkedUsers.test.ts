import fs from "fs";
import { BotProperties } from "../../settings/properties";
import LoadLinkedUsers from "./loadLinkedUsers";

let fileExists: boolean = false;

let users: { key: string; value: string }[] = [];

jest.mock("fs", () => ({
  existsSync: jest.fn(() => fileExists),
  mkdirSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  readdirSync: () => [],
}));

jest.mock("properties-reader", () => () => ({
  each: (forEach: (key: string, value: string) => void) =>
    users.forEach(({ key, value }) => forEach(key, value)),
  set: jest.fn(),
  save: jest.fn(),
}));

describe("State Load Linked Users", () => {
  let loadLinkedUsers: LoadLinkedUsers;

  beforeAll(() => {
    loadLinkedUsers = new LoadLinkedUsers();
  });

  it("Should create a new file if the file does not exist", async () => {
    fileExists = false;
    const writeFileSpy = jest.spyOn(fs, "writeFileSync");
    await loadLinkedUsers.next();
    expect(writeFileSpy).toHaveBeenCalled();
  });

  it("Should not create a new file if the file exists", async () => {
    fileExists = true;
    const writeFileSpy = jest.spyOn(fs, "writeFileSync");
    await loadLinkedUsers.next();
    expect(writeFileSpy).not.toHaveBeenCalled();
  });

  it("Should load the users", async () => {
    users = [
      { key: "discordId1", value: "uuid1" },
      { key: "discordId2", value: "uuid2" },
    ];
    await loadLinkedUsers.next();
    users.forEach(({ key, value }) =>
      expect(BotProperties.linkedUsers[key]).toEqual(value)
    );
  });
});
