var MinNode = require("./MinNode.js");
const log4js = require("./LogConfig");
const logger = log4js.getLogger();
const errLogger = log4js.getLogger("err");
const { debugConfig } = require("./scripts/_debuggerConfig");

(async () => {
  process.on("uncaughtException", (err) => {
    errLogger.error(err);
  });

  process.on("unhandledRejection", (reason, p) => {
    errLogger.error(reason);
  });

  logger.info("node starting");
  console.log(`------------- debugConfig`, debugConfig);
  for (const it of debugConfig) {
    if (it.isDebugger) {
      const node = new MinNode();
      node.item = it;
      node.setParameter(it);
      node.start();
    }
  }
})();
