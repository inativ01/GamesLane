// the next line is very important for using images in JS
/* @pjs preload="../pics/CHESS-pieces.png"; */

/************************************************************************************************
*
*   Define global variables
*
************************************************************************************************/

var ignoreNextUpdate=0;
var reverse=false;                                                    // display reverse board for black player
var mychessIndex=0;                                                   // 0 - no active player
                                                                      // 1 - White
                                                                      // 2 - Black
                                                                      // 3 - Both (single player)

// for each square on the board, boolean indication if there is a legal move for current player starting from it
var lglMoves=[[0,0,0,0,0,0,0,0],
              [0,0,0,0,0,0,0,0],
              [0,0,0,0,0,0,0,0],
              [0,0,0,0,0,0,0,0],
              [0,0,0,0,0,0,0,0],
              [0,0,0,0,0,0,0,0],
              [0,0,0,0,0,0,0,0],
              [0,0,0,0,0,0,0,0]];

var pixelSize;                                                        // translate game pixes to real pixels
var mode="passive";                                                   // "passive" - my player is not playing
                                                                      // "start" - need to select current player piece (FROM location)
                                                                      // "active" - need to select the target of the move (TO location)
                                                                      // "animation" - shows smooth movement of the piece
                                                                      // "pawnUpgrade" - select which piece the pawn upgrade to
var animation= {
    movedPiece:0,                        // the piece type to move
    newPiece:0,                          // the piece at the end of the move (may only be different if pawn upgraded)
    sourceX:0, sourceY:0,                // pixel location at the start of animation
    distanceX:0, distanceY:0,            // distance in pixels to the end of animation
    startMillis:0                        // time (in millis) when animation was started
}

var images=[];                           // array to hold the images of the various pieces
var pieces=loadImage("../pics/CHESS-pieces.png");                                        // fill up array of images of all black and white pieces
var spinner=loadImage("../pics/spinner.png");
var spinnerAngle=0;
var spinnerActive=false;

/************************************************************************************************
*
*   User interface Events
*
************************************************************************************************/

//*************************************************************************************************
//   This function prints out the board based on the board array
//*************************************************************************************************
window.addEventListener('resize', function() {
  pixelSize=Math.min(window.innerWidth,(window.innerHeight-60))/1000;
  $("#chessBoard .gameContent").css("width",pixelSize*1000);
  if($("#chessBoard").is(":visible")) printBoard();
});

//*************************************************************************************************
//   User selected to quit (resign) the game
//*************************************************************************************************
$("#chessBoard .gameButtonEnd").click( function() {
  swal({
    title: "Are you sure?",
    text: "You will forfeit the game!",
//    text: "You will forfeit the "+((gData.playTo==1)?"game":"entire match"),
    icon: "warning",
  dangerMode: true,
  buttons: {
    cancel: {
      visible: true,
      text: "No, keep playing",
      value: false,
      closeModal: true,
    },
    confirm: {
      text: "Yes, I quit!",
      value: "endAll",
      closeModal: true,
    },
  }
  })
  .then(function(value){
    switch (value) {
    case "endAll":
      gInfo.status="quit";
      gInfo.overMsg=auth.currentUser.displayName+" had quit the game";
      db.ref("gameInfo/"+gameID).set(gInfo);
//      db.ref("gameData/"+gInfo.game+"/"+gameID).set(gData);
      break;
   
    default:
      swal({
        title: "Cancelled", 
        text: "Keep Playing", 
        icon: "error",
        buttons: false,
        timer: 1000
      });
    }
  })
});

/************************************************************************************************
*
*   Firebase events
*
************************************************************************************************/

//*************************************************************************************************
// This function is called when the server updates gameData/chess/<gid> for the current game
//*************************************************************************************************

function chessEvent(snapshot) {
  if (!snapshot.val()) return; // information not ready yet
  gData=jQuery.extend(true, {}, snapshot.val()); // copy of gameData from database
  gInfo=gameInfo[gameID];
  
  if (gameID != gInfo.gid) {
    debug(0,"Incorrect Game ID:"+gInfo.gid+"/"+gameID);
    return;
  }
  debug(1,"chessEvent GID="+gameID+" status="+gInfo.status);
  debug(2,gData);
  $("#chessBoard .playerPics").empty();         // pictures of Players
  for (var p in gInfo.playerList) {
    var element= $("<div><img src='"+gInfo.playerList[p].photoURL+"'></div>");
    element.css('background',roleColors[gInfo.playerList[p].role]);
    element.css('border',"medium "+((gInfo.currentPlayer==p)?"solid":"none")+" red");
    element.prop('title', gInfo.playerList[p].displayName);
    $("#chessBoard .playerPics").append(element);
  }
  if (ignoreNextUpdate==2) {
    if (mode == "animation") {
      ignoreNextUpdate=1;                                        // mark that response was received
      return;
    }
    else {                                                           // Late arrival of response - re-do animation
      ignoreNextUpdate=0;
      debug(1,"Finally got response. Stop the spinner");
      spinnerActive=false;
    }
  }
  mychessIndex=0;
  var i=1;
  for (var p in gInfo.playerList) {
    if (gInfo.playerList[p].uid==currentUID) mychessIndex|=i;
    i=i*2;
  }
  debug(2,"mychessIndex="+mychessIndex);
  if (mychessIndex && gInfo.status!="quit")
    $("#chessBoard .gameButtonEnd").attr("disabled",false);
  else
    $("#chessBoard .gameButtonEnd").attr("disabled",true);
  $("#chessBoard .gameTurn").css("color","black");
  $("#chessBoard .gameTurn").html("");
  if (gInfo.status=="active") {
    if (checkPlayer()) $("#chessBoard .gameTurn").css("color","red");
    $("#chessBoard .gameTurn").html(gInfo.playerList[gInfo.currentPlayer].role+" player's turn");
  }
  $("#sjButtons").hide();
  $("#gameButtonJoin").hide();
  $("#gameButtonStart").hide();
  switch(gInfo.status) {
    case "pending":
      var color= (gInfo.playerList[0].role != "White") ? "White" : "Black";
      reverse=(color=="Black");
      $("#gameButtonJoin").val(color);
      $("#gameButtonJoin").html("Join as "+color);
      $("#gameButtonJoin").show();
      $("#sjButtons").show();
      mode="passive";
      printBoard();
      break;
    case "active":
//      reverse=(mychessIndex==2);
      reverse=(gInfo.playerList[1].uid==currentUID && gInfo.playerList[0].uid!=currentUID);  // reverse the board if I'm playing Black only
      printBoard();
      animationInit(gData.movedPiece,gData.newPiece);
      break;
/*      
    case "quit":
      swal({
         title: gInfo.overMsg,
         text: "  ",
         buttons: false,
         icon: "../pics/swal-quit.jpg",
     timer: 2000,
      });

    newGID= 0;
    gameMsg="chess";
    $("#chessBoard").hide();
*/    
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
  debug(2,"Chess started");
  pixelSize=Math.min(window.innerWidth,(window.innerHeight-60))/1000;
  $("#chessBoard .gameContent").css("width",pixelSize*1000);
  for (var i=0; i<12; i++) {
    images[i]=createImage(333,333,RGB);
    if (i<6) images[i].copy (pieces, (i%6)*333,0,333,333,0,0,333,333);  // white pieces
    else images[i].copy (pieces, (i%6)*333,333,333,333,0,0,333,333);    // black pieces
  }
}

//*************************************************************************************************
// Loop - called 60 times per second
//*************************************************************************************************
void draw() {
  if (spinnerActive) {
    translate(500,500);
    spinnerAngle++;
    rotate(PI/9*(Math.round(spinnerAngle/4)%18));
    image(spinner,-50,-50,100,100);
    translate(0,0);
    rotate(0);
  }  
// gameMsg is set when a user enters or leaves a specific game
  if (gameMsg == "chess") {
    debug(2,"New:"+newGID+" Old:"+gameID);
// user left the game. Stop listening to firebase events related to this game
    if (gameID) {
      db.ref("gameData/chess/"+gameID).off();
      db.ref("gameChat/chess/"+gameID).off();
    }
// user entered the game (either as player or watcher). Start listening to firebase events related to this game
    gameID=newGID;
    if (gameID) {
      currentGame=gameMsg;
// Server updated the game information
      db.ref("gameData/chess/"+gameID).on("value", chessEvent);
// Chat messages related to this game
      db.ref("gameChat/chess1/"+gameID).on("child_added", function(snapshot) {
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
    if (deltaT >= 1) {                                               // end of animation - over 1 second
      if (animation.movedPiece > -1)
      {
        gData.board[gData.to.y][gData.to.x]=animation.newPiece;                        // put the saved piece in the new location
        if (animation.newPiece%6==0 && Math.abs(gData.from.x-gData.to.x)==2) {   // castling: king moved two spots
          printBoard();
          if (gData.to.x==2) {                                             // castling to left
            gData.from.x=0;                                                // left rook
            gData.to.x=3;                                                  // move 3 steps right
          }
          else {                                                     // castling to right
            gData.from.x=7;                                                // right rook
            gData.to.x=5;                                                  // move 2 steps left
          }
          animation.movedPiece=animation.newPiece=gData.board[gData.from.y][gData.from.x];     // Rook
          animation.startMillis=millis();
          if (reverse) {
           animation.sourceX= 100*(8-gData.from.x);
           animation.sourceY= 100*(8-gData.from.y);
           animation.distanceX= 100*(gData.from.x-gData.to.x);
           animation.distanceY= 100*(gData.from.y-gData.to.y);
          } else {
           animation.sourceX= 100*(gData.from.x+1);
           animation.sourceY= 100*(gData.from.y+1);
           animation.distanceX= 100*(gData.to.x-gData.from.x);
           animation.distanceY= 100*(gData.to.y-gData.from.y);
          }
          gData.board[gData.from.y][gData.from.x]=-1;                                  // Clear the old location
          return;
        }                                                            // end of castling case
        if (ignoreNextUpdate==2) {                               // Can't complete the move because server did not respond.
          mode="passive"
          debug(1,"delayed response from Server. need to do spinner");
          spinnerActive=true;
          return;
        }
        else {
          if (ignoreNextUpdate==1) {                             // received response
            ignoreNextUpdate=0;
            if (checkPlayer()) $("#chessBoard .gameTurn").css("color","red");
            else               $("#chessBoard .gameTurn").css("color","black");
            reverse=(gInfo.playerList[1].uid==currentUID && gInfo.playerList[0].uid!=currentUID);  // reverse the board if I'm playing Black only
          }
          printBoard();                                            // board may have flipped due to player change
          $("#chessBoard .gameTurn").html(gInfo.playerList[gInfo.currentPlayer].role+" player's turn");
          markSquare(gData.from,#FF0000,2);                                // FROM location is color red
          markSquare(gData.to,#00FF00,2);                                  // TO location is color green
          if (gData.special) {                                             // now need to check special messages or end conditions
            if (gData.special.endGame) {
              if (gData.special.check)
                sweetAlert({
                   title: "CheckMate",
                   text: "",
                   showConfirmButton: true,
                   imageUrl: "../pics/CHESS-checkmate.jpg",
                   imageSize: "400x150",
                });
              else
                sweetAlert({
                   title: "StaleMate",
                   text: "",
                   showConfirmButton: true,
                   imageUrl: "../pics/CHESS-stalemate.jpg",
                   imageSize: "400x150",
                });
              if (mychessIndex) {                                     // Mark player ready to end
                var updates= new Object();
                for (var player in gInfo.playerList)
                  if (gInfo.playerList[player].uid==currentUID)
                    updates[player+'/uid']=0;
                db.ref("/gameInfo/"+gInfo.gid+"/playerList/").update(updates);
              }
        newGID= 0;
        gameMsg="chess";
              $("#chessBoard").hide();
            }
            else if (gData.special.check) {
              sweetAlert({
                 title: "Check",
                 text: "",
                 timer: 2000,
                 showConfirmButton: true,
                 imageUrl: "../pics/CHESS-check.jpg",
                 imageSize: "400x150",
              });
            }
          }
        }
      }
      else printBoard();

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
      markSquare(gData.from,#FF0000,2);                                    // FROM location is color red
      markSquare(gData.to,#00FF00,2);                                      // TO location is color green
      image(images[animation.movedPiece],
            animation.sourceX+deltaT*animation.distanceX,
            animation.sourceY+deltaT*animation.distanceY,
            100,100);
    }
  }  // end of Animation case
}

//*************************************************************************************************
// When mouse is moved and player is active, mark available squares to move to (from pointed square)
//*************************************************************************************************
void mouseMoved() {
  if (mode==="start") {
    if (!checkPlayer()) return;                                      // only the current player can move
    var mouse=mouseSquare();                                         // check what square the mouse is in
    if (mouse.x == -1) return;                                       // exit immediately if mouse no inside the board
    if (mouse.x==gData.from.x && mouse.y==gData.from.y) return;                  // exit immediately if mouse is still at the same square
    gData.from=mouse;
    printBoard();                                                    // clear previous markings
    if (!lglMoves[gData.from.y][gData.from.x]) return;                           // there is no legel move from this square.
    markSquare(gData.from,#FF0000,2);                                      // Mark the start square in red
    for (var j=0;j<8;j++) {
      for (var i=0;i<8;i++) {
        gData.to={x:i,y:j};
        if (checkMove(gData.from,gData.to,true,gData.board)) {
          markSquare(gData.to,#00FF00,2);                                  // Mark the target square in green
        }
      }
    }
  }
}

//*************************************************************************************************
// When mouse is clicked - behavior depends on the internal mode (state machine)
//*************************************************************************************************
void mouseClicked () {
  debug(2,"mouseClicked. Mode="+mode);
  switch (mode) {
    case "active":                                                   // Piece was already selected. click to select where to move the piece
      mouse=mouseSquare();
      if(checkMove(gData.from,mouse,true,gData.board)) {                         // check is the target is a legal move
        gData.to.x=mouse.x; gData.to.y=mouse.y;                                  // remember the target location
        if ((gData.board[gData.from.y][gData.from.x] % 6) === 5 && (gData.to.y%7) ===  0)    // if it's a pawn and it reached the last line
        {
          printBoard();
          if (reverse) {toX=(8-gData.to.x)*100; toY=(8-gData.to.y)*100 }
          else         {toX=(1+gData.to.x)*100; toY=(1+gData.to.y)*100 }
          image(images[1+gInfo.currentPlayer*6],toX,              toY,50,50);
          image(images[2+gInfo.currentPlayer*6],toX+50, toY,50,50);
          image(images[3+gInfo.currentPlayer*6],toX,              toY+50,50,50);
          image(images[4+gInfo.currentPlayer*6],toX+50, toY+50,50,50);
          mode="pawnUpgrade";
          return;
        }
        var piece=gData.board[gData.from.y][gData.from.x];
        finalizeMove(piece,piece);
      }
      if (mouse.x==gData.from.x && mouse.y==gData.from.y) {            // clicked again on the same piece - cancel selection
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
      gData.from.x=mouse.x; gData.from.y=mouse.y;                                // remember the location of square we're moving FROM
      mode="active";                                                 // start looking for the target location
      printBoard();
      markSquare(gData.from,#FF0000,4);                                    // mark that square in red
      for (var j=0;j<8;j++) {
        for (var i=0;i<8;i++) {
          gData.to={x:i,y:j};
          if (checkMove(gData.from,gData.to,true,gData.board)) {
            markSquare(gData.to,#00FF00,4);                                // Mark the target square in green
          }
        }
      }
      break;

    case "pawnUpgrade":                                              // Click to select the piece to which the pawn is upgraded
                                                                     // check if I'm clicking in the correct square
      if((mouseX/pixelSize)<((gData.to.x+1)*100) || (mouseX/pixelSize)>((gData.to.x+2)*100) ||
         (mouseY/pixelSize)<((gData.to.y+1)*100) || (mouseY/pixelSize)>((gData.to.y+2)*100)) return;
      var pawn=gData.board[gData.from.y][gData.from.x];
      var piece=pawn-1;
      if((mouseY/pixelSize)<(gData.to.y*100+150)) piece-=2;
      if((mouseX/pixelSize)<(gData.to.x*100+150)) piece-=1;
      finalizeMove(pawn,piece);
      break;

  }
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
  if ($(".mdl-spinner").hasClass("is-active")) $(".mdl-spinner").removeClass("is-active");
  $("#chessBoard").show();
  size(pixelSize*1000,pixelSize*1000);
  scale(pixelSize,pixelSize); 
  stroke(0);
  fill(#0000FF);
  textFont(loadFont("Meta-Bold.ttf"));
  for(var y = 0, ypos=100; y < 8; y++, ypos+=100) {
    for(var x = 0, xpos=100; x < 8; x++, xpos+=100) {
      if((x+y)%2) fill(100); else fill(255);  // select white or black squares
      rect(xpos,ypos,100,100);  // print an empty square
      if (reverse) {
          if (gData.board[7-y][7-x]> -1)
            image(images[gData.board[7-y][7-x]], xpos, ypos ,100,100);  // print the image of the piece based on the value
      } else {
          if (gData.board[y][x]> -1)
            image(images[gData.board[y][x]], xpos, ypos ,100,100);  // print the image of the piece based on the value
      }
    }
  }
  $("#chessCanvas").show();
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
  var xpos=(x+1)*100;
  var ypos=(y+1)*100;
  noFill();
  stroke(color);
  strokeWeight(width);
  rect(xpos,ypos,100,100);
  strokeWeight(1);
}

//*************************************************************************************************
// return object with board coordinate of the mouse - if it's inside the board
//*************************************************************************************************
function mouseSquare()
{
  var mouse={x:-1, y:-1} ;
  if ((mouseX/pixelSize) >= 100 && (mouseX/pixelSize) < 900 && 
      (mouseY/pixelSize) >= 100 && (mouseY/pixelSize) < 900) {
    mouse.x=Math.floor((mouseX/pixelSize)/100)-1;
    mouse.y=Math.floor((mouseY/pixelSize)/100)-1;
    if (reverse) {
      mouse.x=7-mouse.x;
      mouse.y=7-mouse.y;
    }
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
     var boardT = jQuery.extend(true, {}, gData.board);   // copy the board to a temporary place
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
      if (Math.floor(gData.board[y][x]/6)==gInfo.currentPlayer) {                       // only looks at squares that contain the current player's pieces
        for (var j=0;j<8;j++) {
          for (var i=0;i<8;i++) {
//            gData.to={x:i,y:j};
            if (checkMove({x:x,y:y},{x:i,y:j},true,gData.board)) {
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
//*************************************************************************************************
function checkPlayer() {
  return (gInfo.playerList[gInfo.currentPlayer].uid==currentUID);
}

//*************************************************************************************************
// Let the server know about a completed chess move (called after the user clicked on the destination spot
//*************************************************************************************************
void finalizeMove(movedPiece,newPiece) {
  gData.board[gData.from.y][gData.from.x]=-1;                                      // Clear the old location
  var savedPiece=gData.board[gData.to.y][gData.to.x];
  gData.board[gData.to.y][gData.to.x]=newPiece;
  gInfo.currentPlayer=1-gInfo.currentPlayer;

  var check=check4check(gData.board,gInfo.currentPlayer);
  gData.special={};
  if (check) gData.special.check=true;
  if (!analyzeMoves()) gData.special.endGame=true;
  gData.board[gData.to.y][gData.to.x]=savedPiece;
  gData.movedPiece=movedPiece;
  gData.newPiece=newPiece;
  ignoreNextUpdate=2;
  animationInit(movedPiece,newPiece);                              // start the animation
  db.ref("gameInfo/"+gameID).set(gInfo);
  db.ref("gameData/"+gInfo.game+"/"+gameID).set(gData);
}

function animationInit(movedPiece,newPiece) {
      if (movedPiece > -1) {
         animation.movedPiece=movedPiece;
         animation.newPiece=newPiece;
         animation.startMillis=millis();
         if (reverse) {
           animation.sourceX= 100*(8-gData.from.x);
           animation.sourceY= 100*(8-gData.from.y);
           animation.distanceX= 100*(gData.from.x-gData.to.x);
           animation.distanceY= 100*(gData.from.y-gData.to.y);
         } else {
           animation.sourceX= 100*(1+gData.from.x);
           animation.sourceY= 100*(1+gData.from.y);
           animation.distanceX= 100*(gData.to.x-gData.from.x);
           animation.distanceY= 100*(gData.to.y-gData.from.y);
         }
      }
      else {
        animation.movedPiece= -1;
        animation.startMillis= -1000;
      }
      mode="animation";
}

