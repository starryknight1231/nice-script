// svipEndRewrite.js
let body = $response.body;
let obj = JSON.parse(body);


obj.data = 1

// 将修改后的内容转换回 JSON 字符串
body = JSON.stringify(obj);

// 输出修改后的响应体
$done({body});
