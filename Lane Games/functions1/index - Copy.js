const functions = require('firebase-functions');

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
      switch (msg.game) {
        case 'Chess':
          switch (msg.msg) {
            case 'Join':
              joinChess(gameSnap,msg);
              break;
            case 'EndGame':
              endGameChess(gameSnap,msg);
              break;
            case 'ExitGame':
              exitGameChess(gameSnap,msg);
              break;
            case 'EditStart':
              editStartChess(gameSnap,msg);
              break;
            case 'EditEnd':
              editEndChess(gameSnap,msg);
              break;
            case 'ChessMove':
              chessMove(gameSnap,msg);
              break;
            default:
              console.log("Unexpected Chess message:"+msg.msg);
          }
          break;
        default:
          console.log("Unexpected game:"+msg.game);
      }
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

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function joinChess(gameSnap,msg) {
  if (!gameSnap.val()){
    console.log('new game '+msg.uid);
    var gameInfo={
      status:"pending",
      game:msg.game,
//      game:msg['game'],
      gid:msg.gid,
      players:{},
    } ;
    gameInfo.players[msg.role]={uid:msg.uid,displayName:msg.displayName,photoURL:msg.photoURL};
    var gameData={
      info: gameInfo,
      player:-1,
      from:{x:0, y:0},
      to:{x:0, y:0},
      board:[[10, 9, 8, 7, 6, 8, 9,10], // -1 is an empty slot, 0-5 white pieces, 6-11 black pieces
		 [11,11,11,11,11,11,11,11],
		 [-1,-1,-1,-1,-1,-1,-1,-1],
		 [-1,-1,-1,-1,-1,-1,-1,-1],
		 [-1,-1,-1,-1,-1,-1,-1,-1],
		 [-1,-1,-1,-1,-1,-1,-1,-1],
		 [ 5, 5, 5, 5, 5, 5, 5, 5],
		 [ 4, 3, 2, 1, 0, 2, 3, 4]],
      movedPiece:-1,
      newPiece:-1
    };
    db.ref('gameInfo/'+msg.gid).set(gameInfo);
    db.ref('game/'+msg.game+'/'+msg.gid).set(gameData);
  } else {
    console.log('game exist-start now');
    var gameInfo=gameSnap.val().info;
    if (gameInfo.status=="pending") {
      gameInfo.players[msg.role]={uid:msg.uid,displayName:msg.displayName,photoURL:msg.photoURL};
      gameInfo.status="active";
      var gameData=gameSnap.val();
      gameData.info=gameInfo;
      gameData.player=0;
      db.ref('gameInfo/'+msg.gid).set(gameInfo);
      db.ref('game/'+msg.game+'/'+msg.gid).set(gameData);
    }
    else console.log("Game not Pending. Can't start");
  }
}

function endGameChess(gameSnap,msg) {
  var gameData=gameSnap.val();
  gameData.special=msg.special;
  gameData.board=msg.board;
  gameData.movedPiece=-1;
  db.ref(`game/${msg.game}/${msg.gid}`).set(gameData);
}

function exitGameChess(gameSnap,msg) {
  var gameInfo=gameSnap.val().info;
  var count=0;
  for (var player in gameInfo.players) {
    if (gameInfo.players[player].uid==msg.uid) delete gameInfo.players[player];
    else count++;
  };
  if (count == 0) {     // any players still in the game?
    db.ref("game/Chess/"+msg["gid"]).remove().catch(function(error){console.log("Unable to remove game"+msg["gid"]);console.log(error)});
    db.ref("gameInfo/"+msg["gid"]).remove().catch(function(error){console.log("Unable to remove game"+msg["gid"]);console.log(error)});
    db.ref("gameChat/Chess/"+msg["gid"]).remove().catch(function(error){console.log("Unable to remove game"+msg["gid"]);console.log(error)});
  }
  else {
    var gameData=gameSnap.val();
    gameData.info=gameInfo;
    db.ref('gameInfo/'+msg.gid).set(gameInfo);
    db.ref('game/'+msg.game+'/'+msg.gid).set(gameData);
  }
}

function editStartChess(gameSnap,msg) {
  var gameInfo=gameSnap.val().info;
  if (gameInfo.status=="pending") {
    gameInfo.status="editing";
    var gameData=gameSnap.val();
    gameData.info=gameInfo;
    db.ref('gameInfo/'+msg.gid).set(gameInfo);
    db.ref('game/'+msg.game+'/'+msg.gid).set(gameData);
  }
  else console.log("Game not Pending. Can't edit");
}

function editEndChess(gameSnap,msg) {
  var gameInfo=gameSnap.val().info;
  if (gameInfo.status=="editing") {
    gameInfo.status="pending";
    var gameData=gameSnap.val();
    gameData.info=gameInfo;
    gameData.board=msg.board;
    db.ref('gameInfo/'+msg.gid).set(gameInfo);
    db.ref('game/'+msg.game+'/'+msg.gid).set(gameData);
  }
  else console.log("Game not Editing. Can't stop");
}

function chessMove(gameSnap,msg) {
  var gameInfo=gameSnap.val().info;
  if (gameInfo.status=="active") {
    var gameData=gameSnap.val();
    gameData.board=msg.board;
    gameData.player=1-msg.player;
    gameData.from=msg.from;
    gameData.to=msg.to;
    gameData.newPiece=msg.newPiece;
    if (msg.special) gameData.special=msg.special;
    gameData.movedPiece=msg.movedPiece;
    db.ref('game/'+msg.game+'/'+msg.gid).set(gameData);
    chessChat(msg);                                                     // create chess notation message
  }
  else console.log("Game not Active. Can't move");
}

function chessChat(msg) {
  var chessMsg="";
  var movedPiece=msg.movedPiece;
  var newPiece=msg.newPiece;
  var from=msg.from;
  var to=msg.to;
  if (msg.player==1) chessMsg="... ";                        // start with ... for black player
  if (movedPiece%6==0 && Math.abs(to.x-from.x)==2)                // casteling
  {
    if (to.x==2) chessMsg="o-o-o";                                // Queen side
    else chessMsg="o-o";                                          // King side
  }
  else {
    switch (movedPiece%6) {                                       // ignore the color
      case 0:                                                     // King
        chessMsg+='K';
        break;
      case 1:                                                     // Queen
        chessMsg+='Q';
        break;
      case 2:                                                     // Bishop
        chessMsg+='B';
        break;
      case 3:                                                     // Knight
        chessMsg+='N';
        break;
      case 4:                                                     // Rook
        chessMsg+='R';
        break;
    }
    chessMsg+=String.fromCharCode(97+from.x);                     // column name: a,b,c
    chessMsg+=(8-from.y);                                         // row name, counting from the bottom
    if (msg.board[to.y][to.x]== -1)
      chessMsg+='-';
    else
      chessMsg+='x';
    chessMsg+=String.fromCharCode(97+to.x);                       // column name: a,b,c
    chessMsg+=(8-to.y);                                           // row name, counting from the bottom
    if (newPiece != movedPiece)                                   // pawn upgrade
      switch (newPiece%6) {                                       // ignore the color
        case 1:                                                   // Queen
          chessMsg+='=Q';
          break;
        case 2:                                                   // Bishop
          chessMsg+='=B';
          break;
        case 3:                                                   // Knight
          chessMsg+='=N';
          break;
        case 4:                                                   // Rook
          chessMsg+='=R';
          break;
      }
  }
  db.ref('gameChat/'+msg.game+'/'+msg.gid+'/'+Math.floor(Date.now() / 1000)).set({msg:chessMsg, sender:"Server"});
}
