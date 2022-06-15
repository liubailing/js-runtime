const log4js = require("./LogConfig");
const Utils = require("./entities/Utils");
const logger = log4js.getLogger();
const fs = require("fs");
const utils = new Utils();

class MinNode {
  item = null;
  parameters = new Map();
  constructor() {}

  start() {
    this.doTask();
  }

  setParameter(item) {
    this.item = item;
    //Puppeteer demo mainkeys
    //this.parameters.set('MainKeys',["https://www.toutiao.com/a6949819920771220001"]);
    //Request demo mainkeys
    if (this.item.keyWords && this.item.keyWords.length > 0) {
        this.parameters.set("MainKeys", item.keyWords);
    }else{
        this.parameters.set("MainKeys", []);
    }
  }

  getParameter(paramName) {
    if (this.parameters.has(paramName)) {
      return this.parameters.get(paramName);
    } else {
      return null;
    }
  }

  async doTask() {
    try {
      if (!this.item.jsFile) {
        logger.error(`js文件配置不正确`);
        return;
      }

      const filePath = `./scripts/${this.item.jsFile}`;
      if (!fs.existsSync(filePath)) {
        logger.error(`js文件不存在`);
        return;
      }


      console.log(`---------------- this.item`,this.item)

      let Extractor = require(filePath);
      // let Extractor = require('./scripts/PuppeteerExtractorDemo');
      // let Extractor = require('./scripts/RequestExactorDemo');
      this.extractor = new Extractor(this);
      //script complete
      this.extractor.on("finished", function (node, status) {
        logger.info("finished status" + status);
      });

      // 数据文件
      var strFile = `${utils.dateFormat(Date.now(), "MMdd-hhmmss")}-${this.item.taskName}`;
      //process data
      this.extractor.on("dataExtracted", function (node, data) {
        try {
          fs.appendFileSync(
            `./data/${strFile}.txt`,
            JSON.stringify(data) + "\r\n"
          );
        } catch (err) {
          logger.error(err);
        }
      });

      this.extractor.start();
    } catch (ex) {
      logger.error(ex);
    }
  }
}

module.exports = MinNode;
