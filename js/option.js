var fs = require("fs");

var data = fs.readFileSync('./test.txt','utf-8');

console.log(data.toString());
console.log("程序执行结束!");
