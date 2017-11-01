const functions = require('firebase-functions');
let lane=require('./handleGame');

// The Firebase Admin SDK to access the Firebase Realtime Database.
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);

var db = admin.database();
exports.handleRequest = functions.database.ref('req').onCreate(event => {
  var uid=Object.keys(event.data.val())[0];
  var req=event.data.val()[uid];
  console.log(req.game+" message: "+req.msg);
  var refGame=db.ref('game/'+req.game+'/'+req.gid).once('value',
    // then
    function(gameSnap) {
      var msg=this.val()[Object.keys(event.data.val())[0]];
      if (!gameSnap.val) { console.error("gameSnap is Null"); return; };
      lane.handleGame(db,gameSnap,msg);
    },
    // catch
    function(error) {
      var errorCode = error.code;
      var errorMessage = error.message;
      console.log("Unable to read game info");
      console.log(error);
    },
    // context
    event.data
  );
  db.ref("req/"+uid).remove().catch(function(error){console.log("Unable to remove request");console.log(error)});
});
