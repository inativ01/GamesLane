// the next line is very important for using images in JS
/* @pjs preload="Chess/chess-pieces.png,Chess/red-x.png,Chess/chessboard_full.gif"; */

// Define global variables
// -----------------------

var gameList={};                                                      // List of all gameInfo Chess entries
var myChessIndex=0;                                                   // 0 - no active player
                                                                      // 1 - White
                                                                      // 2 - Black
                                                                      // 3 - Both (single player)

var board=[[-1,-1,-1,-1,-1,-1,-1,-1],
           [-1,-1,-1,-1,-1,-1,-1,-1],
           [-1,-1,-1,-1,-1,-1,-1,-1],
           [-1,-1,-1,-1,-1,-1,-1,-1],
           [-1,-1,-1,-1,-1,-1,-1,-1],
           [-1,-1,-1,-1,-1,-1,-1,-1],
           [-1,-1,-1,-1,-1,-1,-1,-1],
           [-1,-1,-1,-1,-1,-1,-1,-1]];

var lglMoves=[[0,0,0,0,0,0,0,0],
              [0,0,0,0,0,0,0,0],
              [0,0,0,0,0,0,0,0],
              [0,0,0,0,0,0,0,0],
              [0,0,0,0,0,0,0,0],
              [0,0,0,0,0,0,0,0],
              [0,0,0,0,0,0,0,0],
              [0,0,0,0,0,0,0,0]];
var sizeSquare = 6, startX = 6, startY = 6;                           // control the size and location of the board
var player=0;                                                         // 0 for white, 1 for black
var mode="passive";                                                   // "passive" - my player is not playing
                                                                      // "start" - need to select current player piece (FROM location)
                                                                      // "active" - need to select the target of the move (TO location)
                                                                      // "animation" - shows smooth movement of the piece
                                                                      // "pawnUpgrade" - select which piece the pawn upgrade to
var from=     {x:0, y:0};   // start position
var to=       {x:0, y:0};   // end position
var animation= {
    movedPiece:0,                        // the piece type to move
    newPiece:0,                          // the piece at the end of the move (may only be different if pawn upgraded)
    sourceX:0, sourceY:0,                // pixel location at the start of animation
    distanceX:0, distanceY:0,            // distance in pixels to the end of animation
    startMillis:0                        // time (in millis) when animation was started
}

var images=[];                           // array to hold the images of the various pieces
var pieces=loadImage("Chess/chess-pieces.png");                                        // fill up array of images of all black and white pieces
var players= {White:"", Black:""}

// Define functions
// -----------------

// Button-click events
window.addEventListener('resize', function() {
  sizeSquare=Math.floor(Math.min(window.innerWidth/10,window.innerHeight/12));
  $("#chessContent").css("width",sizeSquare*10);
  if($("#chessBoard").is(":visible")) printBoard();
});

$("#closeChess").click( function() {
  newGID= -1;
  gameMsg="chess";
  $("#chessBoard").hide();
});

$("#endChess").click( function() {
  sendReq({
    game:"Chess",
    gid:gameID,
    uid:currentUID,
    msg: "EndGame",
    board: board,
    special: {
      concede: auth.currentUser.displayName
    }
  });
});



$('#chessButtonJoin').click(function() {
  sendReq({
    game:"Chess",
    gid:gameID,
    uid:currentUID,
    msg: "Join",
    role: this.value,
    displayName: auth.currentUser.displayName,
    photoURL: auth.currentUser.photoURL
  });
//  gameMsg="chess";
});

//*************************************************************************************************
//   This function prints out the board based on the board array
//*************************************************************************************************
function printBoard() {
  if ($(".mdl-spinner").hasClass("is-active")) $(".mdl-spinner").removeClass("is-active");
  $("#chessBoard").show();
  size(sizeSquare*10,sizeSquare*10);
  startX=startY=sizeSquare;
  stroke(0);
  fill(#0000FF);
  textFont(loadFont("Meta-Bold.ttf"));
  if (players.White) text('White: '+players.White,startX,sizeSquare/2);
  if (players.Black) text('Black: '+players.Black,startX+4*sizeSquare,sizeSquare/2);

  for(var y = 0, ypos=startY; y < 8; y++, ypos+=sizeSquare) {
    for(var x = 0, xpos=startX; x < 8; x++, xpos+=sizeSquare) {
      if((x+y)%2) fill(100); else fill(255);  // select white or black squares
      rect(xpos,ypos,sizeSquare,sizeSquare);  // print an empty square
      if (board[y][x]> -1)
        image(images[board[y][x]], xpos, ypos ,sizeSquare,sizeSquare);  // print the image of the piece based on the value
    }
  }
  $("#chessCanvas").show();
}

//*************************************************************************************************
// change the color of a selected square
//*************************************************************************************************
function markSquare(location,color,width) {
  if (location.x==-1) return;
  var xpos=startX+location.x*sizeSquare;
  var ypos=startY+location.y*sizeSquare;
  noFill();
  stroke(color);
  strokeWeight(width);
  rect(xpos,ypos,sizeSquare,sizeSquare);
  strokeWeight(1);
}

//*************************************************************************************************
// return object with board coordinate of the mouse - if it's inside the board
//*************************************************************************************************
function mouseSquare()
{
  var mouse={x:-1, y:-1} ;
  if (mouseX >= startX && mouseX < startX+sizeSquare*8 && mouseY >= startY && mouseY < startY+sizeSquare*8) {
    mouse.x=Math.floor((mouseX-startX)/sizeSquare);
    mouse.y=Math.floor((mouseY-startY)/sizeSquare);
  }
  return mouse;
}

//*************************************************************************************************
//  Check is king of given player is under attack
//*************************************************************************************************
function check4check(myBoard, player) {
  var king={x:0, y:0};                                               // find the location of my king
  for (var j=0; j<8; j++)
    for (var i=0; i<8; i++)
      if (myBoard[j][i]== player*6) king={x:i, y:j};
  for (var j=0; j<8; j++)
    for (var i=0; i<8; i++)
      if (Math.floor(myBoard[j][i]/6)== (1-player))                    // only looks at enemy pieces
        if (checkMove({x:i,y:j}, king, false,myBoard)) {
          debug(3,"CHECK:"+i+","+j+" -> "+king.x+","+king.y);
          return true;                                               // a CHECK was found
        }
  return false;                                                      // search didn't find any check
}


//*************************************************************************************************
// Check if the move is valid based on piece type
//*************************************************************************************************
function checkMove(from,to,checkKing,myBoard)
{
  if (Math.floor(myBoard[from.y][from.x]/6)==Math.floor(myBoard[to.y][to.x]/6))
     return false;                                                   // can't move on top of my own piece
  var dX=to.x-from.x;
  var dY=to.y-from.y;
  var absX=Math.abs(dX);
  var absY=Math.abs(dY);
  var piece=myBoard[from.y][from.x];
  switch (piece) {                                                   // check the type of the moving piece
    case 0:                                                          //white king
    case 6:                                                          //black king
      if ((absX <= 1) && (absY <= 1))                                // one square in any direction
        break;
      else if (dY===0 && absX===2 && from.x===4 && (from.y===0 || from.y===7))  // castling
      {
        if ((to.x===2 && myBoard[from.y][3]===-1 && myBoard[from.y][2]===-1 && myBoard[from.y][1]===-1 && myBoard[from.y][0]===(myBoard[from.y][4]+4)) ||
            (to.x===6 && myBoard[from.y][5]===-1 && myBoard[from.y][6]===-1 && myBoard[from.y][7]===(myBoard[from.y][4]+4)))
               break;
        else
             return false;
      }
      else return false;
      break;
    case 1:                                                          //white queen
    case 7:                                                          //black queen
      if (dX===0 || dY===0 || absX===absY) {                         // either straight line or diagonal
        for (var i=1; i<Math.max(absX,absY); i++) {                  // verify a clear path
          if (myBoard[from.y+i*Math.sign(dY)][from.x+i*Math.sign(dX)] >=0) // any square is not empty
             return false;
        }
        break;
      }
      else return false;
      break;
    case 2:                                                          //white bishop
    case 8:                                                          //black bishop
      if (absX===absY) {                                             // diagonal move
        for (var i=1; i<absX; i++) {                                 // verify a clear path
          if (myBoard[from.y+i*Math.sign(dY)][from.x+i*Math.sign(dX)] >=0) // any square is not empty
            return false;
        }
        break;
      }
      else return false;
      break;
    case 3:                                                          //white knight
    case 9:                                                          //black knight
      if ((absX==1 && absY==2)||(absX==2 && absY==1))
        break;
      else return false;
      break;
    case 4:                                                          //white rook
    case 10:                                                         //black rook
      if (dX===0 || dY===0) {                                        // straight line
        for (var i=1; i<Math.max(absX,absY); i++) {                  // verify a clear path
          if (myBoard[from.y+i*Math.sign(dY)][from.x+i*Math.sign(dX)] >=0) // any square is not empty
            return false;
        }
        break;
      }
      else return false;
      break;
    case 5:                                                         //white pawn
      if (myBoard[to.y][to.x]=== -1) {                                // if moving to an emply spot
         if (from.x===to.x && from.y===(to.y+1))                    // single step
            break;
         else if (from.x===to.x && from.y===6 && to.y==4 && myBoard[5][from.x]==-1)   // double step on first move
           break;
         else return false;
      }
      else {  // when taking an opponent piece
        if (from.y===(to.y+1) && absX===1)
          break;
        else return false;
      }
      break;
    case 11:                                                         //black pawn
      if (myBoard[to.y][to.x]=== -1) {                                 // if moving to an emply spot
        if (from.x===to.x && from.y===(to.y-1))                      // single step
          break;
        else if (from.x===to.x && from.y===1 && to.y==3 && myBoard[2][from.x]==-1)   // double step on first move
          break;
        else return false;
      }
      else { // when taking an opponent piece
        if (from.y===(to.y-1) && absX===1)
          break;
        else return false;
      }
      break;
  }
  debug(3,"Move: "+from.x+","+from.y+"->"+to.x+","+to.y);
  if (checkKing) {
     var boardT = jQuery.extend(true, {}, board);   // copy the board to a temporary place
     boardT[from.y][from.x]= -1;
     boardT[to.y][to.x]= piece;
     if (check4check(boardT,Math.floor(piece/6))) return false;  // check if oponent can attack my king after my move. That's an illigal move
  }
  return true;
}

//*************************************************************************************************
//  Go over all the boards, and check if there are any legal moves from any square
//  This function is called once when my move starts (mode change to "start")
//  Returns TRUE if there are ANY legal moves
//*************************************************************************************************
function analyzeMoves() {
  debug(3,"analyze");
  var anyLegal=false;
  for (var y=0; y<8; y++) {
    for (var x=0; x<8; x++) {
      var legalMoves=0;                                              // start counting posible moves from this square
      if (Math.floor(board[y][x]/6)==player) {                       // only looks at squares that contain the current player's pieces
        for (var j=0;j<8;j++) {
          for (var i=0;i<8;i++) {
//            to={x:i,y:j};
            if (checkMove({x:x,y:y},{x:i,y:j},true,board)) {
              legalMoves=anyLegal=true;
            }
          }
        }
      }
      lglMoves[y][x]=legalMoves;
    }
  }
  for (var i=0;i<8;i++) debug(3,lglMoves[i]);
  return anyLegal;
}

//*************************************************************************************************
// Check is I'm currently playing.
// This is done comparing "player" (0-white, 1-black) with "myChessIndex" (bitmap 0-none, 1-white, 2-black, 3-both)
//*************************************************************************************************
function checkPlayer() {
  if (player== -1) return false;
  var p= (1 << player);
  return (myChessIndex & p)
}


//*************************************************************************************************
//  Client-Server Messages
//  ----------------------
//  Messages:
//  * chessStatus:
//      Client to Server:  Observer, White, Black, Leave, EndGame, 
//      Server to Client:  White, Black, EndGame,  
//  * chessInfo: names of white and black players
//  * chessMove: active player (white/black/none), from, to, boards, moved piece, new piece (same as moved piece EXCEPT when pawn is upgraded)
//
//  Process:
//  1. Client connects -> send chessStatus(Observer)
//        Server respond -> send chessInfo and chessMove to this client only
//  2. Client press "Play White" or "Play Black" -> send chessStatus(White/Black)
//        Server checks if the relevat player is free, if so respond with chessStatus(White/Black) and chessMove to the client (only)
//        Server also sends chessInfo to everyone (let them know that active playes have changed)
//        If both white and black player are assigned, server also sends chessMove with initial chess board to everyone
//  3. Active player (white or black) makes a move -> send chessMove to server
//        When server receives chessMove -> update the player field (White <-> Black) and send chessMove to everyone
//        When client receives chessMove -> animate last move (unless moved piece is -1), then only active player (new color) repeats step 3
//  4a. If active player (white or black) leaves the game -> send chessStaus(Leave)
//  4b. If active player (white or black) disconnecs -> server gets a disconnect notification
//        In both cases, server is sending chessInfo to everyone (let them know that active playes have changed)
//        Server then checks of both White and Black left the game -> server clears the chess board and active playes and sends chessMove to everyone
//  5. If the active player identifies end of game (no possible moves) -> send chessStatus(EndGame) -> server send this to everyone
//
//  Notes:
//     * No messages are sent when oservers enters or leaves chess game
//     * If an observer disconnects, server is notified but doesn't send message to other players
//*************************************************************************************************

//*************************************************************************************************
// When receiving 'chessMove' message initiate animation of the last move
//*************************************************************************************************

function chessMoveEvent(snapshot) {
  var data=snapshot.val();
  if (!data) return; // information not ready yet
  if (gameID != data.info.gid) {
    debug(0,"Incorrect Game ID:"+data.info.gid+"/"+gameID);
    return;
  }
  debug(1,"ChessMove GID="+gameID+" status="+data.info.status);
  debug(2,data);
  player=data.player;
  from=data.from;
  to=data.to;
  board=data.board;
  special=data.special;
  myChessIndex=0;
  if (data.info.players.White && data.info.players.White.uid==currentUID) myChessIndex|=1;             // turn on bit 0
  if (data.info.players.Black && data.info.players.Black.uid==currentUID) myChessIndex|=2;             // turn on bit 1
  debug(2,"myChessIndex="+myChessIndex);
  $("#chessButtonJoin").hide();
  if (myChessIndex)
    $("#endChess").attr("disabled",false);
  else
    $("#endChess").attr("disabled",true);
  $("#chessTurn").css("color","black");
  $("#chessTurn").html("");
  switch(data.info.status) {
    case "pending":
      var color= (!data.info.players.White) ? "White" : "Black";
      $("#chessButtonJoin").val(color);
      $("#chessButtonJoin").html("Join as "+color);
      $("#chessButtonJoin").show();
      mode="passive";
      printBoard();
      break;
    case "active":
      printBoard();
      if (data.movedPiece > -1) {
         animation.movedPiece=data.movedPiece;
         animation.newPiece=data.newPiece;
         animation.startMillis=millis();
         animation.sourceX= startX+sizeSquare*from.x;
         animation.sourceY= startY+sizeSquare*from.y;
         animation.distanceX= sizeSquare*(to.x-from.x);
         animation.distanceY= sizeSquare*(to.y-from.y);
      }
      else {
        animation.movedPiece= -1;
        animation.startMillis= -1000;
      }
      if (checkPlayer()) $("#chessTurn").css("color","red");
      if (player==0) $("#chessTurn").html("White player's turn");
      else if (player==1) $("#chessTurn").html("Black player's turn");
      mode="animation";
      break;
  }
  if (special && special.concede) {
    sweetAlert({
       title: special.concede+" had quit the game",
       text: "",
       showConfirmButton: true,
       imageUrl: "i-quit.png",
       imageSize: "400x150",
    });
    if (myChessIndex) sendReq({
      game:"Chess",
      gid:gameID,
      uid:currentUID,
      msg: "ExitGame",
    });
    $("#chessBoard").hide();
  }
  debug(2,"mode="+mode);
}


//*************************************************************************************************
// Initialization
//*************************************************************************************************
void setup() {
  sizeSquare=Math.floor(Math.min(window.innerWidth/10,window.innerHeight/12));
  $("#chessContent").css("width",sizeSquare*10);
  size(sizeSquare*10,sizeSquare*10);
  for (var i=0; i<12; i++) {
    images[i]=createImage(333,333,RGB);
    if (i<6) images[i].copy (pieces, (i%6)*333,0,333,333,0,0,333,333);  // white pieces
    else images[i].copy (pieces, (i%6)*333,333,333,333,0,0,333,333);    // black pieces
  }
}

//*************************************************************************************************
// Loop - used only for animation
//*************************************************************************************************
void draw() {
  if (gameMsg == "chess") {
    debug(2,"New:"+newGID+" Old:"+gameID);
    if (gameID != -1) {
      db.ref("game/Chess/"+gameID).off();
      db.ref("gameChat/Chess/"+gameID).off();
    }
    gameID=newGID;
    if (gameID != -1) {
      db.ref("game/Chess/"+gameID).on("value", chessMoveEvent);
      db.ref("gameChat/Chess/"+gameID).on("child_added", function(snapshot) {
        debug(2,snapshot.val().sender+": "+snapshot.val().msg);
        var notification = document.querySelector('.mdl-js-snackbar');
        notification.MaterialSnackbar.showSnackbar(
          {
            message: snapshot.val().sender+": "+snapshot.val().msg
          }
        );
      });
    }
    gameMsg=null;
    return;
  }
  if (mode==="animation") {
    var deltaT=(millis()-animation.startMillis)/1000;                // time in seconds since the begining of the animation
    if (deltaT >= 1) {        // end of animation - over 1 second
      if (animation.movedPiece > -1)
      {
        board[to.y][to.x]=animation.newPiece;                        // put the saved piece in the new location
        if (animation.newPiece%6==0 && Math.abs(from.x-to.x)==2) {   // castling: king moved two spots
          printBoard();
          if (to.x==2) {                                             // castling to left
            from.x=0;                                                // left rook
            to.x=3;                                                  // move 3 steps right
          }
          else {                                                     // castling to right
            from.x=7;                                                // right rook
            to.x=5;                                                  // move 2 steps left
          }
          animation.movedPiece=animation.newPiece=board[from.y][from.x];     // Rook
          animation.startMillis=millis();
          animation.sourceX= startX+sizeSquare*from.x;
          animation.sourceY= startY+sizeSquare*from.y;
          animation.distanceX= sizeSquare*(to.x-from.x);
          animation.distanceY= sizeSquare*(to.y-from.y);
          board[from.y][from.x]=-1;                                  // Clear the old location
          return;
        }                                                            // end of castling case
        printBoard();
        markSquare(from,#FF0000,2);                                  // FROM location is color red
        markSquare(to,#00FF00,2);                                    // TO location is color green
      }
      else printBoard();

// now need to check special messages or end conditions
      if (special) {
        if (special.endGame) {
          if (special.check)
            sweetAlert({
               title: "CheckMate",
               text: "",
               showConfirmButton: true,
               imageUrl: "Chess/checkmate.jpg",
               imageSize: "400x150",
            });
          else
            sweetAlert({
               title: "StaleMate",
               text: "",
               showConfirmButton: true,
               imageUrl: "Chess/stalemate.jpg",
               imageSize: "400x150",
            });
          if (myChessIndex) sendReq({
            game:"Chess",
            gid:gameID,
            uid:currentUID,
            msg: "ExitGame",
          });
          $("#chessBoard").hide();
        }
        else if (special.check) {
          sweetAlert({
             title: "Check",
             text: "",
             timer: 2000,
             showConfirmButton: true,
             imageUrl: "Chess/check.jpg",
             imageSize: "400x150",
          });
        }
      }

      if (checkPlayer()) {
        mode="start";
        if (!analyzeMoves()) { debug(0,"No legal moves") }           // This check MUST not be removed. All legal moves are calculated.
      }
      else {
        mode="passive"
      }
    }
    else  {                                                          // Animation not ended yet
      printBoard();
      markSquare(from,#FF0000,2);                                    // FROM location is color red
      markSquare(to,#00FF00,2);                                      // TO location is color green
      image(images[animation.movedPiece],
            animation.sourceX+deltaT*animation.distanceX,
            animation.sourceY+deltaT*animation.distanceY,
            sizeSquare,sizeSquare);
    }
  }  // end of Animation case
}

//*************************************************************************************************
// When mouse is moved and player is active, mark available squares to move to (from pointed square)
//*************************************************************************************************
void mouseMoved() {
  if (mode==="start") {
    if (!checkPlayer()) return;                                  // only the current player can move
    var mouse=mouseSquare();                                         // check what square the mouse is in
    if (mouse.x == -1) return;                                       // exit immediately if mouse no inside the board
    if (mouse.x==from.x && mouse.y==from.y) return;                  // exit immediately if mouse is still at the same square
    from=mouse;
    printBoard();                                                    // clear previous markings
    if (!lglMoves[from.y][from.x]) return;                           // there is no legel move from this square.
    markSquare(from,#FF0000,2);                                      // Mark the start square in red
    for (var j=0;j<8;j++) {
      for (var i=0;i<8;i++) {
        to={x:i,y:j};
        if (checkMove(from,to,true,board)) {
          markSquare(to,#00FF00,2);                                  // Mark the target square in green
        }
      }
    }
  }
}

void finalizeMove(movedPiece,newPiece) {
  board[from.y][from.x]=-1;                                      // Clear the old location
  var savedPiece=board[to.y][to.x];
  board[to.y][to.x]=newPiece;
  player=1-player;

  var special={};
  var check=check4check(board,player);
  if (check) special.check=true;
//  else special.check=null;
  if (!analyzeMoves()) special.endGame=true;
  player=1-player;

  board[to.y][to.x]=savedPiece;
  sendReq({
    game:"Chess",
    gid:gameID,
    uid:currentUID,
    msg: "ChessMove",
    special: special,
    player:player, from:from, to:to, board:board, movedPiece:movedPiece, newPiece:newPiece
  });
  mode="passive";                                                // end of my turn
}

//*************************************************************************************************
// When mouse is clicked - behavior depends on the internal mode (state machine)
//*************************************************************************************************
void mouseClicked () {
  debug(2,"mouseClicked. Mode="+mode);
  switch (mode) {
    case "active":                                                   // click to select where to move the piece
      mouse=mouseSquare();
      if(checkMove(from,mouse,true,board)) {                         // check is the target is a legal move
        to.x=mouse.x; to.y=mouse.y;                                  // remember the target location
        if ((board[from.y][from.x] % 6) === 5 && (to.y%7) ===  0)    // if it's a pawn and it reached the last line
        {
          printBoard();
          image(images[1+player*6],startX+to.x*sizeSquare, startY+to.y*sizeSquare,sizeSquare/2,sizeSquare/2);
          image(images[2+player*6],startX+to.x*sizeSquare+sizeSquare/2, startY+to.y*sizeSquare,sizeSquare/2,sizeSquare/2);
          image(images[3+player*6],startX+to.x*sizeSquare, startY+to.y*sizeSquare+sizeSquare/2,sizeSquare/2,sizeSquare/2);
          image(images[4+player*6],startX+to.x*sizeSquare+sizeSquare/2, startY+to.y*sizeSquare+sizeSquare/2,sizeSquare/2,sizeSquare/2);
          mode="pawnUpgrade";
          return;
        }
        var piece=board[from.y][from.x];
        finalizeMove(piece,piece);
      }
      if (mouse.x==from.x && mouse.y==from.y) {						// clicked again on the same piece - cancel selection
        mode="start";
        printBoard();
        return;
      }
//      break;         // fall through

    case "start":                                                    // click to select which piece to move
      if (!checkPlayer()) return;                                // only the current player can move
      var mouse=mouseSquare();                                       // check what square the mouse is in
      if (mouse.x == -1) return;                                     // Mouse was clicked outside the board. Don't do anything.
      if (!lglMoves[mouse.y][mouse.x]) return;                       // if there is no legal move, don't do anything
      from.x=mouse.x; from.y=mouse.y;                                // remember the location of square we're moving FROM
      mode="active";                                                 // start looking for the target location
      printBoard();
      markSquare(from,#FF0000,4);                                    // mark that square in red
      for (var j=0;j<8;j++) {
        for (var i=0;i<8;i++) {
          to={x:i,y:j};
          if (checkMove(from,to,true,board)) {
            markSquare(to,#00FF00,4);                                // Mark the target square in green
          }
        }
      }
      break;

    case "pawnUpgrade":                                              // Click to select the piece to which the pawn is upgraded
                                                                     // check if I'm clicking in the correct square
      if(mouseX<(startX+to.x*sizeSquare) || mouseX>(startX+to.x*sizeSquare+sizeSquare) ||
         mouseY<(startY+to.y*sizeSquare) || mouseY>(startY+to.y*sizeSquare+sizeSquare)) return;
      var pawn=board[from.y][from.x];
      var piece=pawn-1;
      if(mouseY<(startY+to.y*sizeSquare+sizeSquare/2)) piece-=2;
      if(mouseX<(startX+to.x*sizeSquare+sizeSquare/2)) piece-=1;
      finalizeMove(pawn,piece);
      break;

  }
}

