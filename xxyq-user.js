// svipEndRewrite.js
let body = $response.body;
let obj = JSON.parse(body);

// 修改 svipEnd 的值
obj.data.vip = 1;
obj.data.vipReal = 1;
obj.data.svip = 1;
obj.data.vipEnd = "9999-12-31";
obj.data.svipEnd = "9999-12-31";
obj.data.vipEndReal = "9999-12-31";
obj.data.type = 2;
obj.data.svipType = 2;
obj.data.typeReal = 2;
obj.data.vipTotal = 9999;
obj.data.svipEffect = 9999;
obj.data.svipTotal = 9999;
obj.data.vipEffect = 9999;

// 将修改后的内容转换回 JSON 字符串
body = JSON.stringify(obj);

// 输出修改后的响应体
$done({body});
