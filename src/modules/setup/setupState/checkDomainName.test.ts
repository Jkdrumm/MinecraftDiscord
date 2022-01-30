import { User } from "discord.js";
import propertiesReader from "properties-reader";
import Log from "../../log/log";
import {
  BotProperties,
  clearBotProperties,
  properties,
  ServerProperties,
  setProperties,
} from "../../settings/properties";
import CheckDomainName from "./checkDomainName";

let domainName: string | undefined | false = false;
let exampleIp = "123.456.789";

jest.mock("properties-reader", () => () => ({
  get: () => domainName,
  set: jest.fn(),
  save: jest.fn(),
}));

let mockResponse = () => Promise.resolve(exampleIp);

jest.mock("what-is-my-ip-address", () => {
  const mock = jest.createMockFromModule("what-is-my-ip-address") as any;
  mock.v4 = () => mockResponse();
  return mock;
});

describe("State Check Domain Name", () => {
  let checkDomainName: CheckDomainName;

  beforeAll(() => {
    setProperties(propertiesReader("settings.properties"));
  });

  beforeEach(() => {
    clearBotProperties();
    ServerProperties.domainName = false;
    checkDomainName = new CheckDomainName();
  });

  it("Should load the Domain Name if it is saved", async () => {
    domainName = "sampledomain.minecraft.net";
    await checkDomainName.next();
    expect(ServerProperties.domainName).toEqual(domainName);
  });

  it("Should load the public IP address if a Domain Name is not being used", async () => {
    domainName = false;
    const setDomainAsIPAddressSpy = jest.spyOn(
      checkDomainName,
      "setDomainAsIPAddress"
    );
    await checkDomainName.next();
    expect(ServerProperties.domainName).toEqual(exampleIp);
    expect(setDomainAsIPAddressSpy).toHaveBeenCalledTimes(1);
  });

  it("Should prompt the user if there is no domain name setup", async () => {
    domainName = undefined;
    BotProperties.owner = { send: jest.fn() } as unknown as User;
    const sendSpy = jest.spyOn(BotProperties.owner, "send");
    checkDomainName.next();
    expect(sendSpy).toHaveBeenCalledTimes(1);
  });

  it("Should skip setting a domain name if reacting with the ⏩ emoji", async () => {
    const set = properties?.set ?? jest.fn();
    const setObject = { set };
    const setSpy = jest.spyOn(setObject, "set");
    await checkDomainName.reactionOptions("⏩");
    expect(setSpy).toHaveBeenCalledTimes(1);
    expect(setSpy).toHaveBeenCalledWith(expect.any(String), false);
    expect(ServerProperties.domainName).toEqual(exampleIp);
  });

  it("Should set the domain name to what the user sent in a message", async () => {
    const domainName = "samplecustomdomain.minecraft.net";
    const set = properties?.set ?? jest.fn();
    const setObject = { set };
    const setSpy = jest.spyOn(setObject, "set");
    await checkDomainName.messageOptions(domainName);
    expect(setSpy).toHaveBeenCalledTimes(1);
    expect(setSpy).toHaveBeenCalledWith(expect.any(String), domainName);
    expect(ServerProperties.domainName).toEqual(domainName);
  });

  it("Should log to the console if unable to get the public ip", async () => {
    const logSpy = jest.spyOn(Log.getLog(), "logError");
    mockResponse = () => Promise.reject();
    await checkDomainName.setDomainAsIPAddress();
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(ServerProperties.domainName).toEqual(false);
  });
});
