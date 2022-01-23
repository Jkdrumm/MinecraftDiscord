import Log from "../log/log";
import CheckPropertiesFileExists from "./setupState/checkPropertiesFileExists";
import SetupState from "./setupState/setupState";

const setup = async () => {
  let state: SetupState | undefined = new CheckPropertiesFileExists();
  const log = Log.getLog();
  let step = 1;
  log.logInfo("Beggining Initialization");
  do {
    log.logInfo(`(${step++}) ${state.description}`);
    state = await state.next();
  } while (state);
  log.logInfo("Initialization Complete");
};

export default setup;
