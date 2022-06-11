module.exports = class Utils {
  randomNum(Min, Max) {
    let Range = Max - Min;
    let Rand = Math.random();
    return Min + Math.round(Rand * Range); //四舍五入
  }

  timeout(delay) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          resolve(1);
        } catch (e) {
          reject(0);
        }
      }, delay);
    });
  }

  dateFormat(time, fmt) {
    if (!time) {
      return "";
    }
    if (typeof time === "string" ) {
      return "";
    }
    time = new Date(time);
    var o = {
      "M+": time.getMonth() + 1, //月份
      "d+": time.getDate(), //日
      "h+": time.getHours(), //小时
      "m+": time.getMinutes(), //分
      "s+": time.getSeconds(), //秒
      "q+": Math.floor((time.getMonth() + 3) / 3), //季度
      S: time.getMilliseconds(), //毫秒
    };
    if (/(y+)/.test(fmt)) {
      fmt = fmt.replace(
        RegExp.$1,
        (time.getFullYear() + "").substr(4 - RegExp.$1.length)
      );
    }
    for (var k in o) {
      if (new RegExp("(" + k + ")").test(fmt)) {
        fmt = fmt.replace(
          RegExp.$1,
          RegExp.$1.length == 1
            ? o[k]
            : ("00" + o[k]).substr(("" + o[k]).length)
        );
      }
    }
    return fmt;
  }
};
