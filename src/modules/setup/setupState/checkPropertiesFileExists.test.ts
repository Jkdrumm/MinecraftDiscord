import fs from "fs";
import CheckPropertiesFileExists from "./checkPropertiesFileExists";

let fileExists: boolean = false;

jest.mock("fs", () => ({
  existsSync: jest.fn(() => fileExists),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  readdirSync: () => [],
}));

describe("State Check Properties File Exists", () => {
  let checkPropertiesFileExists: CheckPropertiesFileExists;

  beforeAll(() => {
    checkPropertiesFileExists = new CheckPropertiesFileExists();
  });

  it("Should create a new file if the file does not exist", async () => {
    fileExists = false;
    const writeFileSpy = jest.spyOn(fs, "writeFileSync");
    const checkBotToken = await checkPropertiesFileExists.next();
    expect(writeFileSpy).toHaveBeenCalled();
    checkBotToken.rl.close();
  });
});
