const request = require("request");
const puppeteer = require("puppeteer");
try {
  var Extractor = require("../Extractor");
  require("../chrome-extentions/ChromePageExtend");
  require("../chrome-extentions/ChromeElementExtend");
} catch (err) {
  var Extractor = require("../../Extractor");
  require("../../chrome-extentions/ChromePageExtend");
  require("../../chrome-extentions/ChromeElementExtend");
}

const timeout = function (delay) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        resolve(1);
      } catch (e) {
        reject(0);
      }
    }, delay);
  });
};

//Twitter 精准搜索采集 Exact phrase search
class TwitterExactPhraseSearchExtractor extends Extractor {
  constructor(context) {
    super(context);
    this.userLocationMap = new Array();
    this.synonyms = new Array();
    this.extractIds = [];
    this.synonyms["cachaca"] = "cachaça";
    this.synonyms["cafe"] = "café";
    this.api_prex = "https://api.twitter.com/2/search/adaptive.json?";
    this.requestHandler = (request) => {
      delete request.headers()[
        "x-devtools-emulate-network-conditions-client-id"
      ];
      if (request.url().indexOf(`api.twitter.com/2/search/adaptive`) != -1) {
        this.headers = request.headers();
        this.api_prex = "https://api.twitter.com/2/search/adaptive.json?";
      }

      if (request.url().indexOf(`twitter.com/i/api/2/search/adaptive`) != -1) {
        this.headers = request.headers();
        this.api_prex = "https://twitter.com/i/api/2/search/adaptive.json?";
      }
    };
  }

  /**
   * 启动任务
   * @param {*} keywors 
   */
  async _start(keywors) {
    super.logInfo("start extracting");
    this.dataCount = 0;
    this.useBrowerTimes = 0;
    this.isRestartBrowser = false;
    this.startTimestamp = new Date().getTime();

    let maxExtractMinutes = this._context.getParameter("maxExtractMinutes");
    this.maxExtractTime = maxExtractMinutes
      ? maxExtractMinutes * 60 * 1000
      : 7200000;

    super.logInfo("start timestamp " + this.startTimestamp);
    let status = 2;
    try {
      await this.reStartBrowser();

      for (var keyword of keywors) {
        if (this.IsStop) {
          break;
        }
        this.dataCount = 0;
        this.isContinue = true;
        let isSuccess = false;
        let tryTimes = 0;

        while (isSuccess == false && tryTimes < 6) {
          try {
            if (this.IsStop) {
              break;
            }
            tryTimes++;

            if (this.isRestartBrowser) {
              await this.reStartBrowser();
              this.isRestartBrowser = false;
            } else {
              this.isRestartBrowser = true;
            }

            super.logInfo("kewyword " + keyword.trim() + " starting");
            await this.loadHeaders(keyword);

            this.minPosition = null;
            if (this.isContinue && !this.IsStop) {
              await this.doTask(keyword.trim());
            }
            isSuccess = true;
            await timeout(1000);
          } catch (e) {
            this.isRestartBrowser = true;
            super.logError(e);
            super.logInfo("errer ,retry...");
            await timeout(12000);
          }
        }

        super.logInfo(
          keyword +
            " is success " +
            isSuccess +
            " try times " +
            tryTimes +
            " data count " +
            this.dataCount
        );
      }
    } catch (e) {
      status = 1;
      super.logError(e);
    }
    super._onSubTaskFinished(status);
  }

  /**
   * 加载头部
   * @param {*} keyword 
   */
  async loadHeaders(keyword) {
    this.headers = null;
    let url = `https://twitter.com/search?q=${this.decodeKewords(
      keyword.trim()
    )}&src=typd&f=live&vertical=default`;
    await this.page.goto(url);
    this.useBrowerTimes++;
    await this.page.scrollDown(2000);
    let rtimes = 0;
    while (this.headers == null && rtimes < 10) {
      rtimes++;
      await timeout(1000);
      if (this.headers) {
        break;
      }
    }
    this.isRestartBrowser = false;
  }

  /**
   * 执行任务
   * @param {*} keyword 
   */
  async doTask(keyword) {
    while (this.isContinue && !this.IsStop) {
      if (this.IsStop) {
        break;
      }

      if (this.useBrowerTimes > 60) {
        await this.reStartBrowser();
      }
      let url = "";
      if (this.minPosition == null) {
        url = `${
          this.api_prex
        }include_profile_interstitial_type=1&include_blocking=1&include_blocked_by=1&include_followed_by=1&include_want_retweets=1&include_mute_edge=1&include_can_dm=1&include_can_media_tag=1&skip_status=1&cards_platform=Web-12&include_cards=1&include_ext_alt_text=true&include_reply_count=1&tweet_mode=extended&include_entities=true&include_user_entities=true&include_ext_media_color=true&include_ext_media_availability=true&send_error_codes=true&simple_quoted_tweet=true&q=${this.decodeKewords(
          keyword.trim()
        )}&vertical=default&tweet_search_mode=live&count=20&query_source=typd&pc=1&spelling_corrections=1&ext=mediaStats%2ChighlightedLabel%2CcameraMoment&include_quote_count=true`;
      } else {
        url = `${
          this.api_prex
        }include_profile_interstitial_type=1&include_blocking=1&include_blocked_by=1&include_followed_by=1&include_want_retweets=1&include_mute_edge=1&include_can_dm=1&include_can_media_tag=1&skip_status=1&cards_platform=Web-12&include_cards=1&include_ext_alt_text=true&include_reply_count=1&tweet_mode=extended&include_entities=true&include_user_entities=true&include_ext_media_color=true&include_ext_media_availability=true&send_error_codes=true&simple_quoted_tweet=true&q=${this.decodeKewords(
          keyword.trim()
        )}&vertical=default&tweet_search_mode=live&count=20&query_source=typd&cursor=${this.minPosition
          .replace("+", "%2B")
          .replace(
            "=",
            "%3D"
          )}&pc=1&spelling_corrections=1&ext=mediaStats%2ChighlightedLabel%2CcameraMoment&include_quote_count=true`;
      }
      let res = await this.requestPage(url);
      let jsonData;
      try {
        jsonData = JSON.parse(res);
      } catch (e) {
        super.logError(e);
        super.logInfo(res);
      }

      this.useBrowerTimes++;
      await this.extracting(keyword, jsonData.globalObjects);
      await timeout(3000);
      //加载下一页
      let entries = jsonData.timeline.instructions[0].addEntries.entries;
      let cursorEntry = entries[entries.length - 1].content;
      if (
        cursorEntry &&
        cursorEntry.operation &&
        cursorEntry.operation.cursor
      ) {
        this.minPosition = cursorEntry.operation.cursor.value;
      } else {
        let cursor =
          jsonData.timeline.instructions[
            jsonData.timeline.instructions.length - 1
          ].replaceEntry.entry.content;
        if (cursor && cursor.operation && cursor.operation.cursor) {
          this.minPosition = cursor.operation.cursor.value;
        } else {
          break;
        }
      }

      if (this.minPosition == null) {
        break;
      }
    }
  }

  /**
   * 导出
   */
  async extracting(keyword, data) {
    if (!data) {
      return;
    }
    let tweets = Object.values(data.tweets);
    let users = data.users;

    if (tweets) {
      //转帖的原贴
      let quote_ids = [];
      for (let tweet of tweets) {
        if (tweet.quoted_status_id_str) {
          quote_ids.push(tweet.quoted_status_id_str);
        }
      }
      let valiateCount = 0;
      let stopTime = "";
      for (let tweet of tweets) {
        let user = users[tweet.user_id_str];
        let postID = tweet.id_str;
        //转帖的原贴，过滤掉
        if (quote_ids.indexOf(postID) != -1) {
          super.logInfo(`orginal tweet[${postID}] of retweet, ignore it`);
          continue;
        }
        let time = tweet.created_at;
        let userId = tweet.user_id_str;
        let userHandle = user.screen_name;
        let tweetUrl = `https://twitter.com/${userHandle}/status/${postID}`;
        let content = tweet.full_text;
        let userName = user.name;
        let retweetNum = tweet.retweet_count;
        let likeNum = tweet.favorite_count;
        //let commentsNum = tweet.reply_count;
        let userUrl = `https://twitter.com/${userHandle}`;
        let location = user.location;
        stopTime = time;
        let postImageUrl = "";
        let postVideoUrl = "";
        if (tweet.extended_entities && tweet.extended_entities.media) {
          let mediasNode = tweet.extended_entities.media;
          for (let media of mediasNode) {
            if (!postImageUrl && media.type == "photo") {
              postImageUrl = media.media_url;
            } else if (!postVideoUrl && media.type == "video") {
              postVideoUrl = media.expanded_url;
            }
          }
        }
        let ticks = await this.convertTicks(time);
        this.dataCount++;
        let data = {
          SearchCategory: keyword,
          PostID: postID,
          Time: time,
          Timestamp: ticks,
          TweetUrl: tweetUrl,
          Content: content,
          UserHandle: userHandle,
          UserName: userName,
          RetweetNum: retweetNum,
          LikeNum: likeNum,
          //CommentsNum : commentsNum,
          PhotoUrl: postImageUrl,
          VideoUrl: postVideoUrl,
          UserID: userId,
          UserUrl: userUrl,
          Location: location,
        };
        if (this.extractIds.indexOf(postID) == -1) {
          this.extractIds.push(postID);
          this._onUploadFile(data);
        }

        if (9000000 > this.startTimestamp - ticks) {
          valiateCount++;
        }
      }
      let runningSpan = new Date().getTime() - this.startTimestamp;
      if (valiateCount <= 0 || this.maxExtractTime < runningSpan) {
        this.isContinue = false;
        super.logInfo(
          "keyword " + keyword + " is end by timestamp " + stopTime
        );
        return;
      }
    }
  }

  /**
   * 请求页面
   * @param {*} url 
   * @returns 
   */
  async requestPage(url) {
    // let options = {
    //     timeout: 50000,
    //     proxy:'http://127.0.0.1:1080'
    // };
    // let res = request('GET',url, options);
    // return res.getBody('utf8');

    let opt = {
      url: url,
      method: "GET",
      headers: this.headers,
      //gzip:true,
      proxy: "http://127.0.0.1:1080",
    };

    let res = await this.getRequest(opt);
    super.logInfo("url " + url + " " + res.response.statusCode);
    return res.body;
  }

  /**
   * 定义Promise函数
   * @param {*} opts 
   * @returns 
   */
  getRequest(opts) {
    return new Promise((resolve, reject) => {
      request.get(opts, function (err, response, body) {
        //console.log('返回结果：');
        if (!err) {
          if (body !== "null") {
            let results = {
              body: body,
              response: response,
            };
            resolve(results);
          } else {
            reject(err);
          }
        } else {
          reject(err);
        }
      });
    });
  }

  /**
   * 定义Promise函数
   */
  async reStartBrowser() {
    super.logInfo("start browser");
    if (this.browser) {
      try {
        this.page.removeListener("request", this.requestHandler);
        await this.browser.close();
      } catch (e) {
        super.logError(e);
      }
    }
    this.browser = await puppeteer.launch({
      headless: false,
      ignoreDefaultArgs: ["--enable-automation"],
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-infobars",
        "--window-position=0,0",
        "--ignore-certifcate-errors",
        "--ignore-certifcate-errors-spki-list",
        "--disable-crash-reporter",
        '--user-agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3312.0 Safari/537.36"',
      ],
    }); //\
    var view = {
      width: 1920,
      height: 1080,
    };

    this.page = await this.browser.newPage();
    await this.page._client.send("Emulation.clearDeviceMetricsOverride");
    this.page.setViewport(view);
    this.page.on("request", this.requestHandler);
    this.profilePage = null;
    this.useBrowerTimes = 0;

    // if(this.pageUrl){
    //     this.page.navigate(this.pageUrl);
    // }
  }

  /**
   * 
   * @param {*} userID 
   * @param {*} userName 
   * @param {*} userUrl 
   * @returns 
   */
  async getRegisteLocation(userID, userName, userUrl) {
    if (this.userLocationMap[userID]) {
      return this.userLocationMap[userID];
    } else {
      if (this.profilePage == null) {
        this.profilePage = await this.browser.newPage();
        var view = {
          width: 1920,
          height: 1080,
        };
        this.profilePage.setViewport(view);
        await this.profilePage._client.send(
          "Emulation.clearDeviceMetricsOverride"
        );
        this.profilePage.on("request", async (request) => {
          // 隐藏痕迹
          delete request.headers()[
            "x-devtools-emulate-network-conditions-client-id"
          ];
        });
      }
      super.logInfo("request user " + userName + " page");
      //await this.profilePage.navigate(userUrl);
      let profileHtml = await this.requestPage(userUrl);
      let location;
      //return "";

      let isRegError = false;
      try {
        var par =
          /(?=ProfileHeaderCard-locationText u-dir" dir="ltr">?)([\s\S]+?)(?=<\/span>)/;
        let match = par.exec(profileHtml);
        if (match != null) {
          location = match[0]
            .replace('ProfileHeaderCard-locationText u-dir" dir="ltr">', "")
            .trim();
          if (location.indexOf("<") > -1) {
            location = location.replace(/<\/?.+?>/g, "");
            //location = location.replace(/ /g,"");//dds为得到后的内容
          }
          if (location.indexOf("&") > -1 || location.trim() == "") {
            isRegError = true;
          }
        } else {
          isRegError = true;
        }
      } catch (e) {
        super.logError(e);
        isRegError = true;
      }

      if (isRegError == false) {
        //super.logInfo("request user " + userName + " page end");
        return location;
      }

      await this.profilePage.setContent(profileHtml);
      this.useBrowerTimes++;
      let locationNode = await this.profilePage.selectOne(
        "//span[contains(@class,'locationText')]"
      );
      if (locationNode) {
        location = await locationNode.getText();
        this.userLocationMap[userID] = location.trim();
        //super.logInfo("request user " + userName + " page end");
        return location.trim();
      } else {
        return "";
      }
    }
  }

  /**
   * 
   * @param {*} keyword 
   * @returns 
   */
  decodeKewords(keyword) {
    return encodeURI(keyword.trim()).replace(/#/g, "%23").replace(/&/g, "%26");
  }

  contentFilter(content, keyword) {
    let scontent = content.toLowerCase();
    //将文本的空格去除，用于处理关键词为两个词连在一起但内容里的是两个分开词的情况
    let wcontent = scontent.replace(" ", "").replace(" ", "");
    if (wcontent.indexOf(keyword.toLowerCase()) > -1) {
      return false;
    }
    //判断是否有同义词
    let synonym = this.synonyms[keyword.toLowerCase()];
    if (synonym && wcontent.indexOf(synonym) > -1) {
      return false;
    }
    return true;
  }

  async convertTicks(dateStr) {
    let dateTest = new Date(dateStr);
    return dateTest.getTime();
  }
}

module.exports = TwitterExactPhraseSearchExtractor;
