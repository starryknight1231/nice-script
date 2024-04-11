/*
脚本名称：xmy

====================================================================================================
配置 (Quantumult X)
[rewrite_local]
^https:\/\/h5\.moutai519\.com\.cn\/gux\/game\/main\?appConfig=2_1_2 url script-request-headers https://raw.githubusercontent.com/xiany-peng/nice-script/master/qx/mt_my.js

[MITM]
hostname = h5.moutai519.com.cn
*/

const $ = new Env('MT-小茅运');


// 定义变量
$.token = ($.isNode() ? process.env.MT_MY_COOKIE : $.getdata('MT_MY_COOKIE')) || '';
$.deviceId = ($.isNode() ? process.env.MT_DEVICE_ID : $.getdata('MT_DEVICE_ID')) || '';
$.version = ($.isNode() ? process.env.MT_VERSION : $.getdata('MT_VERSION')) || '1.5.9';
$.userAgent = ($.isNode() ? process.env.MT_USERAGENT : $.getdata('MT_USERAGENT')) || 'iOS;16.2;Apple;iPhone 12';
$.myUserAgent = ($.isNode() ? process.env.MT_CLIENT_USERAGENT : $.getdata('MT_MY_USERAGENT')) || '';
$.mtR = ($.isNode() ? process.env.MT_R : $.getdata('MT_R')) || '';
$.is_debug = $.getdata('is_debug') || 'true';


$.userInfo = {}; //存放当前耐力和茅运信息
$.mwInfo = {}; // 酿酒信息
$.travelInfo = {}; //旅行信息

$.messages = [];

// 主函数
function main() {
  !(async () => {
    if (isGetCookie = typeof $request !== `undefined`) {
      GetCookie();
      $.done();
    } else {
      if (!$.token) {
        $.msg($.name, '❌ 请先获取 MT Cookie。');
        return;
      }

      //获取耐力值
      await doGetUserEnergyAward()

      // 执行酿酒相关操作
      await playMv();

      // 执行旅行相关操作
      await playTravel();

      // 发送消息
      await showMsg();
    }
  })()
    .catch((e) => $.logErr(e))
    .finally(() => $.done());
}

// 酿酒相关操作
async function playMv() {
  // 获取用户信息
  await doGetUserInfo();

  // 尝试获取酿酒奖励
  await doTryReceiveXmReward();

  // 查询酿酒信息
  await doGetMwInfo();

  // 尝试开始酿酒
  await doTryStartMw();

}

// 旅游相关操作
async function playTravel() {

  // 尝试获取旅游奖励
  await doTryReceiveTravelReward();

  // 获取用户信息
  await doGetUserInfo();

  // 查询旅行信息
  await doGetTravelInfo();

  // 尝试开始旅行
  await doTryStartTravel();
}

function showMsg() {
  return new Promise(async (resolve) => {
    $.desc = ``;
    $.messages.forEach(msg => {
      $.desc += (msg + '\n')
    })
    if ($.isNode()) {
      const notify = require('./sendNotify');
      await notify.sendNotify($.name, $.desc);
    } else {
      $.msg($.name, ``, $.desc);
    }
    resolve();
  })
}

// 获取ck信息
function GetCookie() {
  if ($request && $request.headers) {
    if ($request.headers['Cookie']) {
      let new_cookie = $request.headers['Cookie'];
      let old_cookie = $.token;
      if (old_cookie !== new_cookie) {
        $.setdata(new_cookie, 'MT_MY_COOKIE');
        $.setdata($request.headers['User-Agent'], 'MT_MY_USERAGENT');
        $.msg($.name, `🎉 小茅运CK获取成功`, `${new_cookie}`);
      } else {
        $.log(`小茅运CK无需更新`, `${new_cookie}`);
      }
    }
  }
}

// 生成消息头
function headers() {
  return {
    'Host': `h5.moutai519.com.cn`,
    'Accept': `application/json, text/javascript, */*; q=0.01`,
    'MT-Device-ID': $.deviceId,
    'MT-Lat': ``,
    'MT-Lng': ``,
    'Accept-Language': `zh-Hans-CN;q=1, en-CN;q=0.9`,
    'Accept-Encoding': `gzip, deflate, br`,
    'MT-Request-ID': generateRequestId(),
    'Client-User-Agent': $.UserAgent,
    'MT-R': $.mtR,
    'MT-APP-Version': $.version,
    'User-Agent': $.myUserAgent,
    'x-csrf-token': ``,
    'Content-Type': `application/json`,
    'Cookie': $.token
  }
}

// 生成请求ID
function generateRequestId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0,
      v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// 获取耐力
async function doGetUserEnergyAward() {
  let opt = {
    url: `https://h5.moutai519.com.cn/game/isolationPage/getUserEnergyAward`,
    headers: headers()
  }
  return new Promise(resolve => {
    $.post(opt, async (err, response, data) => {
      try {
        err && $.log(err);
        let result = $.toObj(data) || response;
        debug(result, "获取耐力")
        if (result.code == 200) {
          $.log(`获取耐力成功`)
          $.messages.push(`获取耐力：成功 `)
        } else {
          $.log(`获取耐力失败：${result.message}`)
          $.messages.push(`获取耐力：失败[${result.message}]`)
        }

      } catch (error) {
        $.log(error);
      } finally {
        resolve()
      }
    })
  })
}

// 获取用户信息
async function doGetUserInfo() {
  let opt = {
    url: `https://h5.moutai519.com.cn/game/userinfo?__timestamp=${new Date().getTime()}&`,
    headers: headers()
  }
  debug(opt);
  return new Promise(resolve => {
    $.get(opt, async (err, response, data) => {
      try {
        err && $.log(err);
        let result = $.toObj(data) || response;
        if (result.code == 2000) {
          $.userInfo = result.data;
          debug($.userInfo, "获取用户信息")
          $.log(`当前茅运：${$.userInfo.xiaomaoyun},耐力：${$.userInfo.energy}`)
        } else {
          $.log(`获取个人信息失败：${result.message}`)
        }

      } catch (error) {
        $.log(error);
      } finally {
        resolve()
      }
    })
  })
}

// 查询酿酒信息
async function doGetMwInfo() {
  let opt = {
    url: `https://h5.moutai519.com.cn/game/xmMw/getXmMwInfo?__timestamp=${new Date().getTime()}&`,
    headers: headers()
  }

  return new Promise(resolve => {
    $.get(opt, async (err, response, data) => {
      try {
        err && $.log(err);
        let result = $.toObj(data) || response;
        if (result.code == 2000) {
          $.mwInfo = result.data;
          debug($.mwInfo, "查询酿酒信息")
        } else {
          $.log(`获取酿酒信息失败：${result.message}`)
        }

      } catch (error) {
        $.log(error);
      } finally {
        resolve()
      }
    })
  })
}

// 尝试开始酿酒
async function doTryStartMw() {
  return new Promise(resolve => {
    if ($.mwInfo.remainMwCnt <= 0) {
      $.messages.push(`酿酒任务：失败[今天酿酒次数已达上限]`)
      $.log(`今天酿酒次数已达上限`)
      resolve();
    } else if ($.userInfo.energy < $.mwInfo.mwRequireEnergy) {
      var msg = `耐力不足，无法酿酒，当前耐力：${$.userInfo.energy}，所需耐力:${$.mwInfo.mwRequireEnergy}`;
      $.messages.push(`酿酒任务：失败[${msg}]`)
      $.log(msg)
      resolve();
    } else {
      let opt = {
        url: `https://h5.moutai519.com.cn/game/xmMw/startMw`,
        headers: headers()
      }
      $.get(opt, async (err, response, data) => {
        try {
          err && $.log(err);
          let result = $.toObj(data) || response;
          debug(result, "尝试酿酒")
          if (result.code == 2000) {
            $.log(`酿酒成功`);
            $.messages.push(`酿酒任务：成功`)
          } else {
            $.messages.push(`酿酒任务：失败[${result.message}]`)
            $.log(result.message)
          }

        } catch (error) {
          $.log(error);
        } finally {
          resolve()
        }
      })
    }
  })
}

// 尝试领取酿酒奖励
async function doTryReceiveXmReward() {
  return new Promise(resolve => {
    let opt = {
      url: `https://h5.moutai519.com.cn/game/xmMw/getXmMwReward?__timestamp=${new Date().getTime()}&`,
      headers: headers()
    }
    $.get(opt, async (err, response, data) => {
      try {
        err && $.log(err);
        let result = $.toObj(data) || response;
        debug(result, "查询酿酒奖励信息")
        if (result.code == 2000 && result.data.receivedMwReward == 0) {
          await doGetReceiveXmReward();
        } else {
          $.log(`暂无酿酒奖励可以获取`)
          $.messages.push(`酿酒奖励：暂无`)
        }
      } catch (error) {
        $.log(error);
      } finally {
        resolve()
      }
    })
  })

}

// 领取酿酒奖励
async function doGetReceiveXmReward() {
  return new Promise(resolve => {
    let opt = {
      url: `https://h5.moutai519.com.cn/game/xmMw/receiveReward`,
      headers: headers(),
      body:`{}`
    }
    $.post(opt, async (err, response, data) => {
      try {
        err && $.log(err);
        let result = $.toObj(data) || response;
        debug(result, "尝试领取酿酒奖励")
        if (result.code == 0) {
          $.messages.push(`领取酿酒奖励：失败[暂无奖励可以领取]`)
          $.log(`领取酿酒奖励失败：暂无奖励可以领取`)
        } else if (result.code == 2000) {
          $.messages.push(`领取酿酒奖励：[${type}]成功`)
          $.log(`领取酿酒奖励成功`);
        } else {
          $.messages.push(`领取酿酒奖励：失败[${result.message}]`)
          $.log(`领取酿酒奖励失败：${result.message}`)
        }

      } catch (error) {
        $.log(error);
      } finally {
        resolve()
      }
    })
  })
}


// 尝试领取旅游奖励
async function doTryReceiveTravelReward() {
  return new Promise(resolve => {
    let opt = {
      url: `https://h5.moutai519.com.cn/game/xmTravel/getXmTravelReward?__timestamp=${new Date().getTime()}&`,
      headers: headers()
    }
    $.get(opt, async (err, response, data) => {
      try {
        err && $.log(err);
        let result = $.toObj(data) || response;
        debug(result, "查询旅游奖励信息")
        if (result.code == 2000 && result.data.receivedTravelReward == 0) {
          await doGetReceiveTravelReward();
        } else {
          $.log(`暂无旅游奖励可以获取`)
          $.messages.push(`旅游奖励：暂无`)
        }
      } catch (error) {
        $.log(error);
      } finally {
        resolve()
      }
    })
  })

}

// 领取旅游奖励
async function doGetReceiveTravelReward() {
  return new Promise(resolve => {
    let opt = {
      url: `https://h5.moutai519.com.cn/game/xmTravel/receiveReward`,
      headers: headers(),
      body:`{}`
    }
    $.post(opt, async (err, response, data) => {
      try {
        err && $.log(err);
        let result = $.toObj(data) || response;
        debug(result, "尝试领取旅游奖励")
        if (result.code == 0) {
          $.messages.push(`领取旅游奖励：失败[暂无奖励可以领取]`)
          $.log(`领取旅游奖励失败：暂无奖励可以领取`)
        } else if (result.code == 2000) {
          $.messages.push(`领取旅游奖励`)
          $.log(`领取旅游奖励成功`);
        } else {
          $.messages.push(`领取旅游奖励：失败[${result.message}]`)
          $.log(`领取旅游奖励失败：${result.message}`)
        }

      } catch (error) {
        $.log(error);
      } finally {
        resolve()
      }
    })
  })
}


// 查询旅行信息
async function doGetTravelInfo() {
  let opt = {
    url: `https://h5.moutai519.com.cn/game/xmTravel/getXmTravelInfo?__timestamp=${new Date().getTime()}&`,
    headers: headers()
  }
  return new Promise(resolve => {
    $.get(opt, async (err, response, data) => {
      try {
        err && $.log(err);
        let result = $.toObj(data) || response;
        if (result.code == 2000) {
          debug($.userInfo, "查询旅行信息")
          $.travelInfo = result.data;
        } else {
          $.log(`获取旅行信息失败：${result.message}`)
        }

      } catch (error) {
        $.log(error);
      } finally {
        resolve()
      }
    })
  })
}

// 尝试开始旅行
async function doTryStartTravel() {
  return new Promise(resolve => {
    if ($.travelInfo.remainTravelCnt <= 0) {
      $.messages.push(`旅行任务：失败[今天旅行次数已达上限]`)
      $.log(`今天旅行次数已达上限`)
      resolve();
    } else if ($.userInfo.energy < $.travelInfo.travelRequireEnergy) {
      var msg = `耐力不足，无法旅行，当前耐力：${$.userInfo.energy}，所需耐力:${$.travelInfo.travelRequireEnergy}`;
      $.log(msg)
      $.messages.push(`旅行任务：失败[${msg}]`)
      resolve();
    } else {
      let opt = {
        url: `https://h5.moutai519.com.cn/game/xmTravel/startTravel`,
        headers: headers()
      }
      $.post(opt, async (err, response, data) => {
        try {
          err && $.log(err);
          let result = $.toObj(data) || response;
          debug(result, "尝试旅行")
          if (result.code == 2000) {
            $.log(`旅行成功`)
            $.messages.push(`旅行任务：成功`)
          } else {
            $.log(`旅行失败：${result.message}`)
            $.messages.push(`旅行任务：失败[${result.message}]`)
          }

        } catch (error) {
          $.log(error);
        } finally {
          resolve()
        }
      })
    }
  })
}

function debug(content, title = "debug") {
  let start = `\n----- ${title} -----\n`;
  let end = `\n----- ${$.time('HH:mm:ss')} -----\n`;
  if ($.is_debug === 'true') {
    if (typeof content == "string") {
      console.log(start + content + end);
    } else if (typeof content == "object") {
      console.log(start + $.toStr(content) + end);
    }
  }
}


// prettier-ignore
function Env(t, e) { class s { constructor(t) { this.env = t } send(t, e = "GET") { t = "string" == typeof t ? { url: t } : t; let s = this.get; return "POST" === e && (s = this.post), new Promise((e, i) => { s.call(this, t, (t, s, r) => { t ? i(t) : e(s) }) }) } get(t) { return this.send.call(this.env, t) } post(t) { return this.send.call(this.env, t, "POST") } } return new class { constructor(t, e) { this.name = t, this.http = new s(this), this.data = null, this.dataFile = "box.dat", this.logs = [], this.isMute = !1, this.isNeedRewrite = !1, this.logSeparator = "\n", this.encoding = "utf-8", this.startTime = (new Date).getTime(), Object.assign(this, e), this.log("", `\ud83d\udd14${this.name}, \u5f00\u59cb!`) } isNode() { return "undefined" != typeof module && !!module.exports } isQuanX() { return "undefined" != typeof $task } isSurge() { return "undefined" != typeof $httpClient && "undefined" == typeof $loon } isLoon() { return "undefined" != typeof $loon } isShadowrocket() { return "undefined" != typeof $rocket } isStash() { return "undefined" != typeof $environment && $environment["stash-version"] } toObj(t, e = null) { try { return JSON.parse(t) } catch { return e } } toStr(t, e = null) { try { return JSON.stringify(t) } catch { return e } } getjson(t, e) { let s = e; const i = this.getdata(t); if (i) try { s = JSON.parse(this.getdata(t)) } catch { } return s } setjson(t, e) { try { return this.setdata(JSON.stringify(t), e) } catch { return !1 } } getScript(t) { return new Promise(e => { this.get({ url: t }, (t, s, i) => e(i)) }) } runScript(t, e) { return new Promise(s => { let i = this.getdata("@chavy_boxjs_userCfgs.httpapi"); i = i ? i.replace(/\n/g, "").trim() : i; let r = this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout"); r = r ? 1 * r : 20, r = e && e.timeout ? e.timeout : r; const [o, a] = i.split("@"), n = { url: `http://${a}/v1/scripting/evaluate`, body: { script_text: t, mock_type: "cron", timeout: r }, headers: { "X-Key": o, Accept: "*/*" } }; this.post(n, (t, e, i) => s(i)) }).catch(t => this.logErr(t)) } loaddata() { if (!this.isNode()) return {}; { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e); if (!s && !i) return {}; { const i = s ? t : e; try { return JSON.parse(this.fs.readFileSync(i)) } catch (t) { return {} } } } } writedata() { if (this.isNode()) { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e), r = JSON.stringify(this.data); s ? this.fs.writeFileSync(t, r) : i ? this.fs.writeFileSync(e, r) : this.fs.writeFileSync(t, r) } } lodash_get(t, e, s) { const i = e.replace(/\[(\d+)\]/g, ".$1").split("."); let r = t; for (const t of i) if (r = Object(r)[t], void 0 === r) return s; return r } lodash_set(t, e, s) { return Object(t) !== t ? t : (Array.isArray(e) || (e = e.toString().match(/[^.[\]]+/g) || []), e.slice(0, -1).reduce((t, s, i) => Object(t[s]) === t[s] ? t[s] : t[s] = Math.abs(e[i + 1]) >> 0 == +e[i + 1] ? [] : {}, t)[e[e.length - 1]] = s, t) } getdata(t) { let e = this.getval(t); if (/^@/.test(t)) { const [, s, i] = /^@(.*?)\.(.*?)$/.exec(t), r = s ? this.getval(s) : ""; if (r) try { const t = JSON.parse(r); e = t ? this.lodash_get(t, i, "") : e } catch (t) { e = "" } } return e } setdata(t, e) { let s = !1; if (/^@/.test(e)) { const [, i, r] = /^@(.*?)\.(.*?)$/.exec(e), o = this.getval(i), a = i ? "null" === o ? null : o || "{}" : "{}"; try { const e = JSON.parse(a); this.lodash_set(e, r, t), s = this.setval(JSON.stringify(e), i) } catch (e) { const o = {}; this.lodash_set(o, r, t), s = this.setval(JSON.stringify(o), i) } } else s = this.setval(t, e); return s } getval(t) { return this.isSurge() || this.isLoon() ? $persistentStore.read(t) : this.isQuanX() ? $prefs.valueForKey(t) : this.isNode() ? (this.data = this.loaddata(), this.data[t]) : this.data && this.data[t] || null } setval(t, e) { return this.isSurge() || this.isLoon() ? $persistentStore.write(t, e) : this.isQuanX() ? $prefs.setValueForKey(t, e) : this.isNode() ? (this.data = this.loaddata(), this.data[e] = t, this.writedata(), !0) : this.data && this.data[e] || null } initGotEnv(t) { this.got = this.got ? this.got : require("got"), this.cktough = this.cktough ? this.cktough : require("tough-cookie"), this.ckjar = this.ckjar ? this.ckjar : new this.cktough.CookieJar, t && (t.headers = t.headers ? t.headers : {}, void 0 === t.headers.Cookie && void 0 === t.cookieJar && (t.cookieJar = this.ckjar)) } get(t, e = (() => { })) { if (t.headers && (delete t.headers["Content-Type"], delete t.headers["Content-Length"]), this.isSurge() || this.isLoon()) this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient.get(t, (t, s, i) => { !t && s && (s.body = i, s.statusCode = s.status ? s.status : s.statusCode, s.status = s.statusCode), e(t, s, i) }); else if (this.isQuanX()) this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => e(t && t.error || "UndefinedError")); else if (this.isNode()) { let s = require("iconv-lite"); this.initGotEnv(t), this.got(t).on("redirect", (t, e) => { try { if (t.headers["set-cookie"]) { const s = t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString(); s && this.ckjar.setCookieSync(s, null), e.cookieJar = this.ckjar } } catch (t) { this.logErr(t) } }).then(t => { const { statusCode: i, statusCode: r, headers: o, rawBody: a } = t, n = s.decode(a, this.encoding); e(null, { status: i, statusCode: r, headers: o, rawBody: a, body: n }, n) }, t => { const { message: i, response: r } = t; e(i, r, r && s.decode(r.rawBody, this.encoding)) }) } } post(t, e = (() => { })) { const s = t.method ? t.method.toLocaleLowerCase() : "post"; if (t.body && t.headers && !t.headers["Content-Type"] && (t.headers["Content-Type"] = "application/x-www-form-urlencoded"), t.headers && delete t.headers["Content-Length"], this.isSurge() || this.isLoon()) this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient[s](t, (t, s, i) => { !t && s && (s.body = i, s.statusCode = s.status ? s.status : s.statusCode, s.status = s.statusCode), e(t, s, i) }); else if (this.isQuanX()) t.method = s, this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => e(t && t.error || "UndefinedError")); else if (this.isNode()) { let i = require("iconv-lite"); this.initGotEnv(t); const { url: r, ...o } = t; this.got[s](r, o).then(t => { const { statusCode: s, statusCode: r, headers: o, rawBody: a } = t, n = i.decode(a, this.encoding); e(null, { status: s, statusCode: r, headers: o, rawBody: a, body: n }, n) }, t => { const { message: s, response: r } = t; e(s, r, r && i.decode(r.rawBody, this.encoding)) }) } } time(t, e = null) { const s = e ? new Date(e) : new Date; let i = { "M+": s.getMonth() + 1, "d+": s.getDate(), "H+": s.getHours(), "m+": s.getMinutes(), "s+": s.getSeconds(), "q+": Math.floor((s.getMonth() + 3) / 3), S: s.getMilliseconds() }; /(y+)/.test(t) && (t = t.replace(RegExp.$1, (s.getFullYear() + "").substr(4 - RegExp.$1.length))); for (let e in i) new RegExp("(" + e + ")").test(t) && (t = t.replace(RegExp.$1, 1 == RegExp.$1.length ? i[e] : ("00" + i[e]).substr(("" + i[e]).length))); return t } msg(e = t, s = "", i = "", r) { const o = t => { if (!t) return t; if ("string" == typeof t) return this.isLoon() ? t : this.isQuanX() ? { "open-url": t } : this.isSurge() ? { url: t } : void 0; if ("object" == typeof t) { if (this.isLoon()) { let e = t.openUrl || t.url || t["open-url"], s = t.mediaUrl || t["media-url"]; return { openUrl: e, mediaUrl: s } } if (this.isQuanX()) { let e = t["open-url"] || t.url || t.openUrl, s = t["media-url"] || t.mediaUrl, i = t["update-pasteboard"] || t.updatePasteboard; return { "open-url": e, "media-url": s, "update-pasteboard": i } } if (this.isSurge()) { let e = t.url || t.openUrl || t["open-url"]; return { url: e } } } }; if (this.isMute || (this.isSurge() || this.isLoon() ? $notification.post(e, s, i, o(r)) : this.isQuanX() && $notify(e, s, i, o(r))), !this.isMuteLog) { let t = ["", "==============\ud83d\udce3\u7cfb\u7edf\u901a\u77e5\ud83d\udce3=============="]; t.push(e), s && t.push(s), i && t.push(i), console.log(t.join("\n")), this.logs = this.logs.concat(t) } } log(...t) { t.length > 0 && (this.logs = [...this.logs, ...t]), console.log(t.join(this.logSeparator)) } logErr(t, e) { const s = !this.isSurge() && !this.isQuanX() && !this.isLoon(); s ? this.log("", `\u2757\ufe0f${this.name}, \u9519\u8bef!`, t.stack) : this.log("", `\u2757\ufe0f${this.name}, \u9519\u8bef!`, t) } wait(t) { return new Promise(e => setTimeout(e, t)) } done(t = {}) { const e = (new Date).getTime(), s = (e - this.startTime) / 1e3; this.log("", `\ud83d\udd14${this.name}, \u7ed3\u675f! \ud83d\udd5b ${s} \u79d2`), this.log(), this.isSurge() || this.isQuanX() || this.isLoon() ? $done(t) : this.isNode() && process.exit(1) } }(t, e) }

// 主函数
main();
