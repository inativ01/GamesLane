'use strict'
/* Hello, World! program in node.js */
let http = require("http");
let express = require('express');
let lane=require('./handleGame');

let app =  express();
let server = http.createServer(app);


app.use(express.static(__dirname));
//app.use(express.static("h:/Documents/Incoming/JS"));
server.listen(8000, () => console.log("ready to work "+__dirname));

let firebase = require("firebase-admin");

var serviceAccount = require("games-lane-firebase-adminsdk-blif0-479b944ede.json");

firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
  databaseURL: "https://games-lane.firebaseio.com",
});
console.log("Firebase ready");
var db = firebase.database();
db.ref("req").on("child_added", function(snapshot) {
  var req=snapshot.val();
  var uid=req.uid;
  console.log(req.game+" message: "+req.msg+" from "+uid);
  db.ref('gameData/'+req.game+'/'+req.gid).once('value',
    // then
    function(gameSnap) {
      var msg=this.val();
      var pr1=(lane.handleGame(db,gameSnap,msg));
      pr1.catch(function(error) {console.log("Error Message="+error.message)});
    },
    // catch
    function(error) {
      var errorCode = error.code;
      var errorMessage = error.message;
      console.log("Unable to read game info");
      console.log(error);
    },
    // context
    snapshot
  );
  db.ref("req/"+uid).remove().catch(function(error){console.log("Unable to remove request");console.log(error)});
});
