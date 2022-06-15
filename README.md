# octopus-script-sdk  A SDK to compile your own Octoparse scripts

The js-runtime-min section sets the minimum running environment requirements for any node js extraction script.

JavaScript libraries installed on cloud nodes are listed as follows, therefore your scripts should not contain any other libraries outside the list for them to work.
```
{
  "dependencies": {
    "axios": "0.18.1",
    "cheerio": "1.0.0-rc.3",
    "commander": "4.0.1",
    "js2xmlparser": "4.0.0",
    "jszip": "3.2.2",
    "log4js": "4.1.1",
    "lz4js": "0.2.0",
    "msgpack5": "4.2.1",
    "proxy-agent": "3.1.1",
    "puppeteer": "1.5.0",
    "puppeteer-extra": "3.1.18",
    "puppeteer-extra-plugin-stealth": "2.7.8",
    "puppeteer-extra-plugin-user-preferences": "2.2.12",
    "request": "2.88.0",
    "sync-request": "6.1.0",
    "util": "0.12.1",
    "uuid": "3.3.3",
    "zlib": "1.0.5"
  }
}
```
The entry point for the program is: index.js

Add the following launch.json configuration to your VS Code:
```
{
    // Use IntelliSense to learn about possible attributes.
    // Hover to view descriptions of existing attributes.
    // For more information, visit: https://go.microsoft.com/fwlink/?linkid=830387
    "version": "0.2.0",
    "configurations": [
        {
            "type": "node",
            "request": "launch",
            "name": "Launch Program",
            "program": "${workspaceFolder}\\index.js"
        }
    ]
}
```

Git pull the code and npm-install to set up your coding environment .
Finish your scripts and put them under the scripts section. Check the following two demo scripts for your needs: PuppeteerExtractorDemo.js is for data extraction through web browsers, and RequestExactorDemo.js is for data extraction by sending requests. 
Two paraments need to be modified for MinNode.js to work.
Set your paraments, remember to fill in the MainKeys.
```
constructor() {
    this.parameters = new Map();
    //Puppeteer demo mainkeys
    //Puppeteer demo mainkeys
    //this.parameters.set('MainKeys',["https://www.toutiao.com/a6949819920771220001"]);
    //Request demo mainkeys
    this.parameters.set('MainKeys',["101010100","101020100","101030100"]);
}
```

Select the script you would like to debug.
```
async doTask(){
    try {
        // Select the script you would like to debug.
        //let Extractor = require('./scripts/PuppeteerExtractorDemo');
        let Extractor = require('./scripts/RequestExactorDemo');
        this.extractor = new Extractor(this);
        //script complete
        this.extractor.on("finished", function (node, status) {
            logger.info("finished status" + status);
        });

        //process data
        this.extractor.on("dataExtracted", function (node, data) {
            try {
                fs.appendFileSync('./data/data.json', JSON.stringify(data)+"\r\n");
            } catch(err) {
                logger.error(err)
            }
            
        });

        this.extractor.start();
    } catch(ex) {
        logger.error(ex)
    }
    
}
```
