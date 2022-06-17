const request = require("request");
const cheerio = require("cheerio");
try {
  var Extractor = require("../Extractor");
  require("../chrome-extentions/ChromePageExtend");
  require("../chrome-extentions/ChromeElementExtend");
} catch (err) {
  var Extractor = require("../../Extractor");
  require("../../chrome-extentions/ChromePageExtend");
  require("../../chrome-extentions/ChromeElementExtend");
}

/**
 * 进程延时等待
 * @param {*} delay
 * @returns
 */
const delayProcess = function (delay) {
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

const queryUrl = `https://65i5thjkdt-dsn.algolia.net/1/indexes/*/queries?x-algolia-agent=Algolia%20for%20JavaScript%20(4.13.1)%3B%20Browser%20(lite)%3B%20JS%20Helper%20(3.8.2)%3B%20react%20(16.14.0)%3B%20react-instantsearch%20(6.24.3)&x-algolia-api-key=dd9afb854a4e918c5b90223130468ae9&x-algolia-application-id=65I5THJKDT`;
const startTime = Date.parse(new Date("2022-01-01")) / 1000;
const endTime = Date.parse(new Date("2022-06-01")) / 1000;
// 列表数据
const resListData = new Map();
const pageCount = 20;
const proxy = "http://127.0.0.1:7890";

//HK01 精准搜索采集 Exact phrase search
class HK01ExactPhraseSearchExtractor extends Extractor {
  constructor(context) {
    super(context);
    this.requestHandler = (request) => {
      // 删除调试标签
      delete request.headers()[
        "x-devtools-emulate-network-conditions-client-id"
      ];
    };
  }

  /**
   * 启动任务
   * @param {*} keywors
   */
  async _start(keywors) {
    super.logInfo("start extracting");
    this.dataCount = 0;
    this.startTimestamp = new Date().getTime();

    super.logInfo("start timestamp " + this.startTimestamp);
    let status = 2;
    // 获取列表数据
    try {
      // await this.startBrowser();

      for (let keyword of keywors) {
        console.log(` --- 搜索关键字 ${keywors.indexOf(keyword)+1}`);
        await this.requestList(keyword.trim(), 0);
        await delayProcess(1000);
      }
    } catch (e) {
      status = 1;
      super.logError(e);
    }
    // 获取详情数据
    try {
      for (let keyword of keywors) {
        keyword = keyword.trim();
        const currList = resListData.get(keyword);
        for (const item of currList) {
          await this.getDetail(keyword, item);
          await delayProcess(1000);
        }
      }
    } catch (e) {
      status = 1;
      super.logError(e);
    }
    super._onSubTaskFinished(status);
  }

  /**
   * 请求页面
   * @param {*} url
   * @returns
   */
  async requestList(keyWord, pageIndex) {
    if (!pageIndex) {
      pageIndex = 0;
    }

    let opt = {
      url: queryUrl,
      method: "POST",
      headers: {
        Referer: "https://universal-search.hk01.com/",
        Origin: "https://universal-search.hk01.com",
        Host: "65i5thjkdt-dsn.algolia.net",
        "content-type": "application/x-www-form-urlencoded",
      },
      // gzip:true,
      // proxy: "http://127.0.0.1:1080",
      // body:`{"requests":[{"indexName":"prod-writing","params":"highlightPreTag=%3Cais-highlight-0000000000%3E&highlightPostTag=%3C%2Fais-highlight-0000000000%3E&facets=%5B%5D&tagFilters="},{"indexName":"prod-writing","params":"highlightPreTag=%3Cais-highlight-0000000000%3E&highlightPostTag=%3C%2Fais-highlight-0000000000%3E&query=a&filters=is_video%3Afalse%20AND%20is_show%3Atrue%20AND%20publish_start_at_ts%20%3C%201655214129.529%20AND%20(publish_end_at_ts%20%3D%200%20OR%20publish_end_at_ts%20%3E%201655214129.529)&hitsPerPage=10&page=2&facets=%5B%5D&tagFilters="}]}`
      body: `{"requests":[{"indexName":"prod-writing","params":"highlightPreTag=%3Cais-highlight-0000000000%3E&highlightPostTag=%3C%2Fais-highlight-0000000000%3E&query=${keyWord}&filters=is_video%3Afalse%20AND%20is_show%3Atrue%20AND%20publish_start_at_ts%20%3C%20${endTime}%20AND%20(publish_end_at_ts%20%3D%200%20OR%20publish_end_at_ts%20%3E%20${endTime})&hitsPerPage=${pageCount}&page=${pageIndex}&facets=%5B%5D&tagFilters="}]}`,
    };

    const { response } = await this.requestPost(opt);
    super.logInfo(
      `query=${keyWord}&page=${pageIndex},statusCode${response.statusCode}`
    );
    // console.log(`返回状态 ${response.statusCode},结果：${response.body}`);
    // const res = JSON.parse(response.body);
    let jsonData = JSON.parse(response.body);
    console.log(`关键字 ${keyWord},页码：${pageIndex}`);
    if (jsonData && jsonData.results) {
      await this.getList(keyWord, jsonData.results[0]);
      await delayProcess(3000);
    }
  }

  /**
   * 获得信息列表
   * @param {} keyword  关键字
   * @param {*} data 页码数据
   * @returns
   */
  async getList(keyword, data) {
    if (!data) {
      return;
    }
    let { page, hits, nbPages } = data;
    // 如果存在这个值
    if (resListData.has(keyword)) {
      let curData = resListData.get(keyword);
      // curData.set(page, hits);
      curData = curData.concat(hits);
      resListData.set(keyword, curData);
    } else {
      // let curData = new Map();
      // curData.set(page, hits);
      if (!hits || hits.length < 1) {
        hits = [];
      }
      resListData.set(keyword, hits);
    }

    if (nbPages > 1 && nbPages > page && hits.length) {
      // 当前页码最后一条数据
      const lastData = hits[hits.length - 1];

      // 如果最后一条数据的时间大于2022-01-01 则继续请求下一页
      if (lastData && lastData.published_at_ts > startTime) {
        await this.requestList(keyword, page + 1);
      }
    }

    // this._onUploadFile(data);
  }

  /**
   *
   * @param {*} listItem
   * @returns
   */
  async getDetail(keyword, listItem) {
    const { id, url, title, published_at, published_at_ts, authors } = listItem;
    // 如果时间小于 起始时间，则返回
    if (published_at_ts && published_at_ts < startTime) {
      return;
    }

    let strAuthor,
      strArticle = "";
    if (authors && authors.length) {
      strAuthor = authors[0].publish_name;
    }

    if (url) {
      let opt = {
        url: encodeURI(url),
        method: "GET",
        gzip: true,
        timeout: 60000,
        proxy: proxy,
      };
      const { body, response } = await this.requestGet(opt);
      if (body) {
        let $ = cheerio.load(body);
        $("#article-content-section .wpkev30:last").remove();
        $("#article-content-section .flex-col:last").remove();
        let strImg = $('meta[property="og:image"]').attr('content')
        let strContent = $("#article-content-section").text();
        strArticle = `${strContent}  ${strImg}`;
      }
    }

    this._onUploadFile({
      网站: "https://www.hk01.com",
      关键字: keyword,
      标题: title,
      正文: strArticle,
      发布时间: published_at,
      作者: strAuthor,
      原网站: url,
      采集时间: new Date(),
    });
  }

  /**
   * Post 数据
   * @param {*} opts
   * @returns
   */
  requestPost(opts) {
    return new Promise((resolve, reject) => {
      request.post(opts, function (err, response, body) {
        // console.log("返回结果：", response, opts);
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
   * Get 数据
   * @param {*} opts
   * @returns
   */
  requestGet(opts) {
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
}

module.exports = HK01ExactPhraseSearchExtractor;
