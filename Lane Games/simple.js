'use strict'
/* Hello, World! program in node.js */
let http = require("http");
// let var fs = require("fs"); // file system
let express = require('express');

let app =  express();
let server = http.createServer(app);

app.use(express.static(__dirname));
//app.use(express.static("h:/Documents/Incoming/JS"));
server.listen(8000, () => console.log("ready to work "+__dirname));

console.log("listening...");
