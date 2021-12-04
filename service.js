const Service = require("node-windows").Service;
console.log(`${__dirname}\\index.js`);
// Create a new service object
const svc = new Service({
  name: "Discord Minecraft Bot",
  description: "A bot for checking minecraft server status.",
  script: `${__dirname}\\index.js`,
  nodeOptions: ["--harmony", "--max_old_space_size=4096"],
  //, workingDirectory: '...'
  //, allowServiceLogon: true
});

// Listen for the "install" event, which indicates the
// process is available as a service.
svc.on("install", function () {
  svc.start();
});

svc.install();
