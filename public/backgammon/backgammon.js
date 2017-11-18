// the next line is very important for using images in JS
/* @pjs preload="../chess/chess-pieces.png */

/************************************************************************************************
*
*   Define global variables
*
************************************************************************************************/
// -----------------------

var boardImage=loadImage("../backgammon/board1.jpg");
var pieces=[loadImage("../backgammon/piece0.png"),loadImage("../backgammon/piece1.png")];
var sidepieces=[loadImage("../backgammon/sidepiece0.png"),loadImage("../backgammon/sidepiece1.png")];

var reverse=false;                                                    // display reverse board for black player
var gameList={};                                                      // List of all gameInfo backgammon entries
var mybackgammonIndex=0;                                                   // 0 - no active player
                                                                      // 1 - White
                                                                      // 2 - Black
                                                                      // 3 - Both (single player)

// Current backgammon board
var board=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
var board1=[2,0,0,0,0,-5,0,-3,0,0,0,5,-5,0,0,0,3,0,5,0,0,0,0,-2,0,0,0,0];

// for each square on the board, boolean indication if there is a legal move for current player starting from it
var lglMoves=[[0,0,0,0,0,0,0,0],
              [0,0,0,0,0,0,0,0],
              [0,0,0,0,0,0,0,0],
              [0,0,0,0,0,0,0,0],
              [0,0,0,0,0,0,0,0],
              [0,0,0,0,0,0,0,0],
              [0,0,0,0,0,0,0,0],
              [0,0,0,0,0,0,0,0]];

var sizeSquare, startX, startY;                                       // control the size and location of the board
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

var players= {White:"", Black:""}

/************************************************************************************************ 
*
*   User interface Events
*
************************************************************************************************/

//*************************************************************************************************
//   This function prints out the board based on the board array
//*************************************************************************************************
window.addEventListener('resize', function() {
  sizeSquare=Math.floor(Math.min(window.innerWidth/4,(window.innerHeight-60)/3));
  $("#backgammonContent").css("width",sizeSquare*4);
  if($("#backgammonBoard").is(":visible")) printBoard();
});

//*************************************************************************************************
//   User selected to go to main menul
//*************************************************************************************************
$("#backgammonClose").click( function() {
  newGID= -1;
  gameMsg="backgammon";
  $("#backgammonBoard").hide();
});

//*************************************************************************************************
//   User selected to quit (resign) the game
//*************************************************************************************************
$("#backgammonEnd").click( function() {
  sendReq({
    game:"backgammon",
    gid:gameID,
    uid:currentUID,
    msg: "Quit",
    board: board,
    concede: auth.currentUser.displayName
  });
});

//*************************************************************************************************
//   go to the game Options screen
//*************************************************************************************************
$("#backgammonNewButton").click( function() {
  if (!auth.currentUser.isAnonymous) {
    mode="passive";
    $("#backgammonOptionsBoard").show();
    $("#backgammonOptionsHeader").show();
    for(var i = 0; i < 28; i++) board[i] = board1[i];
    mode="passive";
  }
});

//*************************************************************************************************
//   exit the Options screen and don't start the game
//*************************************************************************************************
$("#backgammonCancelOptions").click(function() {
    $("#backgammonOptionsBoard").hide();
});

//*************************************************************************************************
//   done with Options, start the game
//*************************************************************************************************
$('#backgammonStartButton').click(function() {
  newGID=Math.floor(Math.random() * (1000000000000));
  sendReq({
    game:"backgammon",
    gid:newGID,
    uid:currentUID,
    msg: "Start",
    role: $("#backgammonRole").val(),
    board: board,
    displayName: auth.currentUser.displayName,
    photoURL: auth.currentUser.photoURL
  });
  gameMsg="backgammon";
  $("#backgammonOptionsBoard").hide();
  $(".mdl-spinner").addClass("is-active");
});


//*************************************************************************************************
//   User selected to join the game as a player
//*************************************************************************************************
$("#backgammonButtonJoin").click(function() {
  sendReq({
    game:"backgammon",
    gid:gameID,
    uid:currentUID,
    msg: "Join",
    role: this.value,
    displayName: auth.currentUser.displayName,
    photoURL: auth.currentUser.photoURL
  });
});

/************************************************************************************************ 
*
*   Firebase events
*
************************************************************************************************/

//*************************************************************************************************
// This function is called when the server updates gameData/backgammon/<gid> for the current game
//*************************************************************************************************

function backgammonEvent(snapshot) {
  var data=snapshot.val();
  if (!data) return; // information not ready yet
  if (gameID != data.info.gid) {
    debug(0,"Incorrect Game ID:"+data.info.gid+"/"+gameID);
    return;
  }
  debug(1,"backgammonMove GID="+gameID+" status="+data.info.status);
  debug(2,data);
  player=data.player;
  from=data.from;
  to=data.to;
  board=data.board;
  special=data.special;
  mybackgammonIndex=0;
  if (data.info.players.White && data.info.players.White.uid==currentUID) mybackgammonIndex|=1;             // turn on bit 0
  if (data.info.players.Black && data.info.players.Black.uid==currentUID) mybackgammonIndex|=2;             // turn on bit 1
  debug(2,"mybackgammonIndex="+mybackgammonIndex);
  $("#backgammonButtonJoin").hide();
  if (mybackgammonIndex)
    $("#backgammonEnd").attr("disabled",false);
  else
    $("#backgammonEnd").attr("disabled",true);
  $("#backgammonTurn").css("color","black");
  $("#backgammonTurn").html("");
  switch(data.info.status) {
    case "pending":
      var color= (!data.info.players.White) ? "White" : "Black";
      reverse=(color=="Black");
      $("#backgammonButtonJoin").val(color);
      $("#backgammonButtonJoin").html("Join as "+color);
      $("#backgammonButtonJoin").show();
      mode="passive";
      printBoard();
      break;
    case "active":
      reverse=((mybackgammonIndex==2)||(mybackgammonIndex==3 && player==1));
      printBoard();
      if (data.movedPiece > -1) {
         animation.movedPiece=data.movedPiece;
         animation.newPiece=data.newPiece;
         animation.startMillis=millis();
         if (reverse) {
           animation.sourceX= startX+sizeSquare*(7-from.x);
           animation.sourceY= startY+sizeSquare*(7-from.y);
           animation.distanceX= sizeSquare*(from.x-to.x);
           animation.distanceY= sizeSquare*(from.y-to.y);
         } else {
           animation.sourceX= startX+sizeSquare*from.x;
           animation.sourceY= startY+sizeSquare*from.y;
           animation.distanceX= sizeSquare*(to.x-from.x);
           animation.distanceY= sizeSquare*(to.y-from.y);
         }
      }
      else {
        animation.movedPiece= -1;
        animation.startMillis= -1000;
      }
      if (checkPlayer()) $("#backgammonTurn").css("color","red");
      if (player==0) $("#backgammonTurn").html("White player's turn");
      else if (player==1) $("#backgammonTurn").html("Black player's turn");
      mode="animation";
      break;
    case "quit":
      sweetAlert({
         title: data.info.concede+" had quit the game",
         text: "",
         showConfirmButton: true,
         imageUrl: "../i-quit.png",
         imageSize: "400x150",
      });
/*
      if (mybackgammonIndex) sendReq({
        game:"backgammon",
        gid:gameID,
        uid:currentUID,
        msg: "ExitGame",
      });
*/
      $("#backgammonBoard").hide();
  }
  debug(2,"mode="+mode);
}

/************************************************************************************************ 
*
*   Processing.js functions and events
*
************************************************************************************************/

//*************************************************************************************************
// Initialization
//*************************************************************************************************
void setup() {
  sizeSquare=Math.floor(Math.min(window.innerWidth/4,(window.innerHeight-60)/3));
  $("#backgammonContent").css("width",sizeSquare*4);
  size(sizeSquare*4,sizeSquare*3);
}

//*************************************************************************************************
// Loop - called 60 times per second
//*************************************************************************************************
void draw() {

// gameMsg is set when a user enters or leaves a specific game	
  if (gameMsg == "backgammon") {
    debug(2,"New:"+newGID+" Old:"+gameID);
// user left the game. Stop listening to firebase events related to this game	
    if (gameID != -1) {
      db.ref("gameData/backgammon/"+gameID).off();
      db.ref("gameChat/backgammon/"+gameID).off();
    }
// user entered the game (either as player or watcher). Start listening to firebase events related to this game	
    gameID=newGID;
    if (gameID != -1) {
// Server updated the game information
      db.ref("gameData/backgammon/"+gameID).on("value", backgammonEvent);
// Chat messages related to this game
      db.ref("gameChat/backgammon/"+gameID).on("child_added", function(snapshot) {
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

// Animation mode: move pieces to a new location
  if (mode==="animation") {
    var deltaT=(millis()-animation.startMillis)/1000;                // time in seconds since the begining of the animation
    if (deltaT >= 1) {        										 // end of animation - over 1 second
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
               imageUrl: "../backgammon/checkmate.jpg",
               imageSize: "400x150",
            });
          else
            sweetAlert({
               title: "StaleMate",
               text: "",
               showConfirmButton: true,
               imageUrl: "../backgammon/stalemate.jpg",
               imageSize: "400x150",
            });
          if (mybackgammonIndex) sendReq({
            game:"backgammon",
            gid:gameID,
            uid:currentUID,
            msg: "ExitGame",
          });
          $("#backgammonBoard").hide();
        }
        else if (special.check) {
          sweetAlert({
             title: "Check",
             text: "",
             timer: 2000,
             showConfirmButton: true,
             imageUrl: "../backgammon/check.jpg",
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
    else  {                                                          // Animation not ended yet. Keep moving the piece
      printBoard();
      markSquare(from,#FF0000,2);                                    // FROM location is color red
      markSquare(to,#00FF00,2);                                      // TO location is color green
    }
  }  // end of Animation case
}

//*************************************************************************************************
// When mouse is moved and player is active, mark available squares to move to (from pointed square)
//*************************************************************************************************
void mouseMoved() {
/*
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
*/  
}

//*************************************************************************************************
// When mouse is clicked - behavior depends on the internal mode (state machine)
//*************************************************************************************************
void mouseClicked () {
  debug(2,"mouseClicked. Mode="+mode);
  var mouse=mouseSquare();
  if (mouse >=0) board[mouse]++;
  printBoard();
/*
  switch (mode) {
    case "active":                                                   // Piece was already selected. click to select where to move the piece
      mouse=mouseSquare();
  debug(1,mouse);
      if(checkMove(from,mouse,true,board)) {                         // check is the target is a legal move
        to.x=mouse.x; to.y=mouse.y;                                  // remember the target location
        if ((board[from.y][from.x] % 6) === 5 && (to.y%7) ===  0)    // if it's a pawn and it reached the last line
        {
          printBoard();
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
//      break;         // fall through. This allow the player to change his mind regarding the start position

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
*/
}

/************************************************************************************************
*
*   Service funtions (called by events)
*
************************************************************************************************/

//*************************************************************************************************
//   This function prints out the board based on the board array
//*************************************************************************************************
function printBoard() {
  size(sizeSquare*4,sizeSquare*3);
  image(boardImage,0,0,sizeSquare*4,sizeSquare*3);
  textFont(loadFont("Meta-Bold.ttf"));
  for (var i=0;i<24;i++) {
    var color=(board[i]>0)?1:0;
//    var offset=(i<12)? sizeSquare*-0.2 : sizeSquare*0.2;
//    if (abs(board[i])>6) offset*=0.5;
    for (var j=0;j<abs(board[i]);j++)
    {
      var l=bgLocation(i,j);
      image(pieces[color],l.x,l.y,sizeSquare*0.2,sizeSquare*0.2);
    }
  }
  for (var i=24;i<26;i++) {
    for (var j=0;j<board[i];j++) {
      l=bgLocation(i,j);
      image(pieces[i-24],l.x,l.y,sizeSquare*0.2,sizeSquare*0.2);
    }
  }
  for (var i=26;i<28;i++) {
    for (var j=0;j<board[i];j++) {
      l=bgLocation(i,j);
      image(sidepieces[i-26],l.x,l.y,sizeSquare*0.2,sizeSquare*0.1);
    }
  }

  if ($(".mdl-spinner").hasClass("is-active")) $(".mdl-spinner").removeClass("is-active");
  $("#backgammonBoard").show();
  $("#backgammonCanvas").show();
}

//*************************************************************************************************
// change the color of a selected square
//*************************************************************************************************
function markSquare(location,color,width) {
  if (location.x==-1) return;
  var x=location.x, y=location.y;
  if (reverse) {
    x=7-x; y=7-y;
  }
  var xpos=startX+x*sizeSquare;
  var ypos=startY+y*sizeSquare;
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
  var x=Math.floor(mouseX/sizeSquare/0.236)-2;
  var y=Math.floor(mouseY/sizeSquare/1.5);
  var n;

  if (x<0) n=-1;
  else if (x<6) n=(y)?(11-x):(12+x);
  else if (x==6) n=(y)?25:24;
  else if (x<13) n=(y)?(12-x):(11+x);
  else n=(y)?27:26;
  return n;
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
// This is done comparing "player" (0-white, 1-black) with "mybackgammonIndex" (bitmap 0-none, 1-white, 2-black, 3-both)
//*************************************************************************************************
function checkPlayer() {
  if (player== -1) return false;
  var p= (1 << player);
  return (mybackgammonIndex & p)
}

//*************************************************************************************************
// Let the server know about a completed backgammon move (called after the user clicked on the destination spot
//*************************************************************************************************
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
    game:"backgammon",
    gid:gameID,
    uid:currentUID,
    msg: "ChessMove",
    special: special,
    player:player, from:from, to:to, board:board, movedPiece:movedPiece, newPiece:newPiece
  });
  mode="passive";                                                // end of my turn
}

function bgLocation(index,count) {
  var factor= (abs(board[index])>6)?1:2;
  var l={x:0,y:0};
  if (index<24) {
    if (index<12)
      l.y=sizeSquare*(2.65-count*factor*0.1);
    else
      l.y=sizeSquare*(0.15+count*factor*0.1);
    i1=index%6;
    switch ((index-i1)/6) {
      case 0:
        l.x=sizeSquare*(3.3-i1*0.23);
        break;
      case 1:
        l.x=sizeSquare*(1.67-i1*0.23);
        break;
      case 2:
        l.x=sizeSquare*(0.5+i1*0.23);
        break;
      case 3:
        l.x=sizeSquare*(2.15+i1*0.23);
        break;
    }
  }
  else if (index<26) {   // "eaten" pieces
    l.x=sizeSquare*1.9;
    l.y=sizeSquare*((index==24) ? 1.2-count*factor*0.1 : 1.6+count*factor*0.1);
  }
  else {                 // completed pieces
    l.x=sizeSquare*3.7;
    l.y=sizeSquare*((index==26) ? 0.1+count*0.05 : 2.80-count*0.05);
  }
  return l;
}
