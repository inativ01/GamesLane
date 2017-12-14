'use strict'
let lane=require('./handleGame');
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
      return lane.handleGame(db,gameSnap,msg)
      .then(function() {  
	    return db.ref("req/"+uid).remove().catch(function(error){console.log("Unable to remove request");console.log(error)});
      })
      .catch(function(error) {console.log("Error Message="+error.message)});
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
});
