const log4js = require('./LogConfig');
const Utils = require('./entities/Utils');
const logger = log4js.getLogger();
const fs = require("fs");

const utils = new Utils();

class MinNode {
    constructor() {
        this.parameters = new Map();
        //Puppeteer demo mainkeys
        //this.parameters.set('MainKeys',["https://www.toutiao.com/a6949819920771220001"]);
        //Request demo mainkeys
        this.parameters.set('MainKeys',["nike","101020100","101030100"]);
    }

    start() {
        this.doTask();
    }

    getParameter(paramName) {
        if(this.parameters.has(paramName)){
            return this.parameters.get(paramName);
        }else {
            return null;
        }
    }

    async doTask(){
        try {
            let Extractor = require('./scripts/TwitterSocial');
            // let Extractor = require('./scripts/PuppeteerExtractorDemo');
            // let Extractor = require('./scripts/RequestExactorDemo');
            this.extractor = new Extractor(this);
            //script complete
            this.extractor.on("finished", function (node, status) {
                logger.info("finished status" + status);
            });

            var str = utils.dateFormat(Date.now(),"yyyyMMdd-hhmmss");
            //process data
            this.extractor.on("dataExtracted", function (node, data) {
                try {
                    fs.appendFileSync(`./data/data${str}.txt`, JSON.stringify(data)+"\r\n");
                } catch(err) {
                    logger.error(err)
                }
                
            });

            this.extractor.start();
        } catch(ex) {
            logger.error(ex)
        }
        
    }
}

module.exports = MinNode;