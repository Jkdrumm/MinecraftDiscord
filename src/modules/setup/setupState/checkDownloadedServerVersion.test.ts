import { ServerProperties } from "../../settings/properties";
import CheckDownloadedServerVersion from "./checkDownloadedServerVersion";

let fileExists: boolean;
let currentVersion: string = "newest";

jest.mock("fs", () => ({
  existsSync: jest.fn(() => fileExists),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  readdirSync: jest.fn((fileName: string) => {
    if (fileName === undefined) return [];
    if (fileName.endsWith("/commands"))
      return jest.requireActual("fs").readdirSync(fileName);
    return [
      { name: currentVersion, isDirectory: () => true, endsWith: () => true },
    ];
  }),
  mkdirSync: jest.fn(),
  createWriteStream: () => ({ close: jest.fn() }),
  unlinkSync: jest.fn(),
  lstatSync: () => ({ isDirectory: () => true }),
}));
jest.mock("axios", () => ({
  get: (url: string) => {
    if (url.endsWith("version_manifest_v2.json"))
      return {
        data: {
          latest: { release: "newest" },
          versions: [{ id: "newest", sha1: "sha" }],
        },
      };
    if (url.endsWith("bedrock"))
      return {
        data: `<a href="https://minecraft.azureedge.net/bin-win/bedrock-server-newest.zip" aria-label=`,
      };
    if (url.startsWith("https://launchermeta.mojang.com"))
      return {
        data: {
          downloads: {
            server: {
              url: "java-download-url",
            },
          },
        },
      };
  },
}));

jest.mock("path");

jest.mock(
  "adm-zip",
  () =>
    class AdmZip {
      constructor(_: string) {}
      extractAllTo(_: string) {}
    }
);

const mockObject = {
  on: (event: string, callback: any) => {
    if (event === "finish") callback();
    return mockObject;
  },
  pipe: () => mockObject,
};

jest.mock("superagent", () => ({
  get: () => mockObject,
}));

describe("State Check Downloaded Server Version", () => {
  let checkDownloadedServerVersion: CheckDownloadedServerVersion;

  beforeEach(() => {
    checkDownloadedServerVersion = new CheckDownloadedServerVersion();
  });

  it("should load the most current version saved if it is the newest version for Java Edition", async () => {
    ServerProperties.isJavaEdition = true;
    await checkDownloadedServerVersion.next();
    expect(ServerProperties.version).toBe("newest");
  });

  it("should load the most current version saved if it is the newest version for Bedrock Edition", async () => {
    ServerProperties.isJavaEdition = false;
    await checkDownloadedServerVersion.next();
    expect(ServerProperties.version).toBe("newest");
  });

  it("should download the most current version if it is not already installed for Java Edition", async () => {
    ServerProperties.isJavaEdition = true;
    currentVersion = "old";
    await checkDownloadedServerVersion.next();
    expect(ServerProperties.version).toBe("newest");
  });

  it("should download the most current version if it is not already installed for Bedrock Edition", async () => {
    ServerProperties.isJavaEdition = false;
    currentVersion = "old";
    await checkDownloadedServerVersion.next();
    expect(ServerProperties.version).toBe("newest");
  });
});
