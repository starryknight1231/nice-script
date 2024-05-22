// svipEndRewrite.js
let body = $response.body;
let obj = JSON.parse(body);

// 修改 svipEnd 的值
obj.data.user.vip = 1;
obj.data.user.vipReal = 1;
obj.data.user.svip = 1;
obj.data.user.vipEnd = "9999-12-31";
obj.data.user.svipEnd = "9999-12-31";
obj.data.user.vipEndReal = "9999-12-31";
obj.data.user.type = 2;
obj.data.user.svipType = 2;
obj.data.user.typeReal = 2;
obj.data.user.vipTotal = 9999;
obj.data.user.svipEffect = 9999;
obj.data.user.svipTotal = 9999;
obj.data.user.vipEffect = 9999;

obj.data.children.nickName ="珩X"

// 将修改后的内容转换回 JSON 字符串
body = JSON.stringify(obj);

// 输出修改后的响应体
$done({body});
