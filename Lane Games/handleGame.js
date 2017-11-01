module.exports = {  // start of all export functions
  handleGame: function(db,gameSnap,msg) {
    var pr;
    switch (msg.game) {
      case 'Chess':
        switch (msg.msg) {
          case 'Start':
            pr=startChess(db,gameSnap,msg);
            break;
          case 'Join':
            pr=joinChess(db,gameSnap,msg);
            break;
          case 'EndGame':
            pr=endGameChess(db,gameSnap,msg);
            break;
          case 'ExitGame':
            pr=exitGameChess(db,gameSnap,msg);
            break;
          case 'ChessMove':
            pr=chessMove(db,gameSnap,msg);
            break;
          default:
            pr=Promise.reject(new Error("Unexpected Chess message:"+msg.msg));
        }
        break;
      default:
        pr=Promise.reject(new Error("Unexpected game:"+msg.game));
    }
    return pr;
  }
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
var debugLevel=2;

function debug(level, msg) {
  switch (level) {
    case 0: console.error(msg);
       break;
    case 1: console.warn(msg);
       break
    default: if (level<=debugLevel) console.log(msg);
  }
}

function updateGame(db,msg,gameInfo,gameData) {
  debug(1,`Updated game ${msg.gid}`);
  if (gameInfo) {
	var pr1=db.ref(`gameInfo/${msg.gid}`).set(gameInfo);
	var pr2=db.ref(`game/${msg.game}/${msg.gid}`).set(gameData);
	return Promise.all([pr1,pr2]);
  }
  else return db.ref(`game/${msg.game}/${msg.gid}`).set(gameData);
}


function startChess(db,gameSnap,msg) {
  if (gameSnap.val()) return Promise.reject(new Error("New game already exists"));
  var gameInfo={
	game:msg.game,
	gid:msg.gid,
	players:{},
  } ;
  var gameData={
    from:{x:0, y:0},
    to:{x:0, y:0},
    board: msg.board,
    movedPiece:-1,
    newPiece:-1
  };
  if (msg.role == 'Single') {
	gameInfo.players.White=gameInfo.players.Black={uid:msg.uid,displayName:msg.displayName,photoURL:msg.photoURL};
	gameInfo.status='active';
	gameData.player=0;
  }
  else { // Black or White
	gameInfo.players[msg.role]={uid:msg.uid,displayName:msg.displayName,photoURL:msg.photoURL};
	gameInfo.status='pending';
	gameData.player=-1;
  }
  gameData.info=gameInfo;
  return updateGame(db,msg,gameInfo,gameData);
}


function joinChess(db,gameSnap,msg) {
	if (!gameSnap.val()) return Promise.reject(new Error("Game does not exists"));
	var gameInfo=gameSnap.val().info;
	if (gameInfo.status=="pending") {
	  gameInfo.players[msg.role]={uid:msg.uid,displayName:msg.displayName,photoURL:msg.photoURL};
	  gameInfo.status="active";
	  var gameData=gameSnap.val();
	  gameData.info=gameInfo;
	  gameData.player=0;
	  return updateGame(db,msg,gameInfo,gameData);
	}
	else return Promise.reject(new Error("Game not Pending. Can't start"));
}

function endGameChess(db,gameSnap,msg) {
  var gameData=gameSnap.val();
  gameData.special=msg.special;
  gameData.board=msg.board;
  gameData.movedPiece=-1;
  return db.ref(`game/${msg.game}/${msg.gid}`).set(gameData);
}

function exitGameChess(db,gameSnap,msg) {
  var gameInfo=gameSnap.val().info;
  var count=0;
  for (var player in gameInfo.players) {
    if (gameInfo.players[player].uid==msg.uid) delete gameInfo.players[player];
    else count++;
  };
  if (count == 0) {     // any players still in the game?
    var pr1=db.ref("game/Chess/"+msg["gid"]).remove();
    var pr2=db.ref("gameInfo/"+msg["gid"]).remove();
    var pr3=db.ref("gameChat/Chess/"+msg["gid"]);
    return Promise.all([pr1,pr2,pr3]);
  }
  else {
    var gameData=gameSnap.val();
    gameData.info=gameInfo;
    var pr1=db.ref('gameInfo/'+msg.gid).set(gameInfo);
    var pr2=db.ref('game/'+msg.game+'/'+msg.gid).set(gameData);
    return Promise.all([pr1,pr2]);
  }
}

function chessMove(db,gameSnap,msg) {
  var gameInfo=gameSnap.val().info;
  if (gameInfo.status=="active") {
    var gameData=gameSnap.val();
    gameData.board=msg.board;
    gameData.player=1-msg.player;
    gameData.from=msg.from;
    gameData.to=msg.to;
    gameData.newPiece=msg.newPiece;
    if (msg.special) gameData.special=msg.special;
    else gameData.special=null;
    gameData.movedPiece=msg.movedPiece;
    pr1=db.ref('game/'+msg.game+'/'+msg.gid).set(gameData);
    pr2=chessChat(db,msg);                                                     // create chess notation message
    return Promise.all([pr1,pr2]);
  }
  else return Promise.reject(new Error("Game not Active. Can't move"));
}

function chessChat(db,msg) {
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
  return db.ref('gameChat/'+msg.game+'/'+msg.gid+'/'+Math.floor(Date.now() / 1000)).set({msg:chessMsg, sender:"Server"});
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

