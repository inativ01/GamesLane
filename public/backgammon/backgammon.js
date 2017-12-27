/************************************************************************************************
*
*   Define global variables
*
************************************************************************************************/
// -----------------------

var cnst={
  boardImage:loadImage("../backgammon/board1.jpg"),
  pieces:[loadImage("../backgammon/piece0.png"),loadImage("../backgammon/piece1.png")],
  sidepieces:[loadImage("../backgammon/sidepiece0.png"),loadImage("../backgammon/sidepiece1.png")],
  sidepiecesR:[loadImage("../backgammon/sidepiece0R.png"),loadImage("../backgammon/sidepiece1R.png")],
  diceImg:[0,0,0,0,0,0],
//  boardStart:[1,0,0,0,0,-5,0,0,0,0,0,5,0,0,0,0,3,0,5,0,0,0,0,0,0,0,0,0],  // negative: white, positive: black/brown
  boardStart:[2,0,0,0,0,-5,0,-3,0,0,0,5,-5,0,0,0,3,0,5,0,0,0,0,-2,0,0,0,0],  // negative: white, positive: black/brown
  dir:[-1,1],
  rollButton:[2.7,1.4,0.4,0.2],
  diceSize:0.2,
  diceX1:2.5,
  diceX2:2.9,
  diceY:1.4,
  diceArea:[2.5,1.3,0.8,0.4], // X,Y,W,H
};

var ignoreNextUpdate=0;
var gData={};
var gInfo={};

var pieceMoving={
  from:0,
  active:false,
  animateDice:0,
};

var reverse=false;                                                    // display reverse board for black player
var mybackgammonIndex=0;                                              // 0 - no active player
                                                                      // 1 - White
                                                                      // 2 - Black
                                                                      // 3 - Both (single player)

// Current backgammon board

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
var mode="passive";                                                   // "passive" - my player is not playing
                                                                      // "active" - player can roll dice or move pieces
                                                                      // "animation" - shows smooth movement of the piece or dice rolling
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
  gInfo.status="quit";
  gInfo.concede=auth.currentUser.displayName;
  db.ref("gameData/"+gInfo.game+"/"+gameID).set(gData);
  db.ref("gameInfo/"+gameID).set(gInfo);
});

//*************************************************************************************************
//   go to the game Options screen
//*************************************************************************************************
$("#backgammonNewButton").click( function() {
  if (!auth.currentUser.isAnonymous) {
    mode="passive";
    $("#backgammonOptionsBoard").show();
    $("#backgammonOptionsHeader").show();
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
  gInfo={
    game:"backgammon",
    gid:newGID,
    players:{},
    currentUID:-1,
    status:'pending'
  } ;
  gData={
    board: cnst.boardStart,
    currentPlayer:-1,
    moveCnt:0,
    diceMoves:[0,0,0,0],
    dice:[0,0],
  };
  gInfo.players[$("#backgammonRole").val()]={
    uid:currentUID,
    displayName:auth.currentUser.displayName,
    photoURL:auth.currentUser.photoURL
  };
  gData.info=gInfo;
  db.ref("gameData/"+gInfo.game+"/"+newGID).set(gData);
  db.ref("gameInfo/"+newGID).set(gInfo);
  gameMsg="backgammon";
  $("#backgammonOptionsBoard").hide();
  $(".mdl-spinner").addClass("is-active");
});


//*************************************************************************************************
//   User selected to join the game as a player
//*************************************************************************************************
$("#backgammonButtonJoin").click(function() {
  if (gInfo.status=="pending") {
    gInfo.players[this.value]={
      uid:currentUID,
      displayName:auth.currentUser.displayName,
      photoURL:auth.currentUser.photoURL};
    gInfo.status="active";
    gInfo.currentUID=gInfo.players["White"].uid;
    gData.currentPlayer=0;
    db.ref("gameData/"+gInfo.game+"/"+gameID).set(gData);
    db.ref("gameInfo/"+gameID).set(gInfo);
  }
  else debug(0,"Game not Pending. Can't start");
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
  if (!snapshot.val()) return; // information not ready yet
  gData=jQuery.extend(true, {}, snapshot.val()); // copy of gameData from database
  gInfo=gData.info;
  if (gameID != gInfo.gid) {
    debug(0,"Incorrect Game ID:"+gInfo.gid+"/"+gameID);
    return;
  }
  debug(1,"backgammonMove GID="+gameID+" status="+gInfo.status);
  debug(2,gData);
  debug(2,gInfo);
  mybackgammonIndex=0;
  if (gInfo.players.White && gInfo.players.White.uid==currentUID) mybackgammonIndex|=1;             // turn on bit 0
  if (gInfo.players.Black && gInfo.players.Black.uid==currentUID) mybackgammonIndex|=2;             // turn on bit 1
  debug(2,"mybackgammonIndex="+mybackgammonIndex);
  $("#backgammonButtonJoin").hide();
  if (mybackgammonIndex)
    $("#backgammonEnd").attr("disabled",false);
  else
    $("#backgammonEnd").attr("disabled",true);
  $("#backgammonTurn").css("color","black");
  $("#backgammonTurn").html("");
  switch(gInfo.status) {
    case "pending":
      var color= (!gInfo.players.White) ? "White" : "Black";
      reverse=(color=="Black");
      $("#backgammonButtonJoin").val(color);
      $("#backgammonButtonJoin").html("Join as "+color);
      $("#backgammonButtonJoin").show();
      mode="passive";
      printBoard();
      break;
    case "active":
      reverse=((mybackgammonIndex==2)||(mybackgammonIndex==3 && gData.currentPlayer==1));
      printBoard();
      if (checkPlayer()) $("#backgammonTurn").css("color","red");
      if (gData.currentPlayer==0) $("#backgammonTurn").html("White player's turn");
      else if (gData.currentPlayer==1) $("#backgammonTurn").html("Black player's turn");
      if (mode !="animation") mode="active";
      break;
    case "quit":
      sweetAlert({
         title: gInfo.concede+" had quit the game",
         text: "",
         showConfirmButton: true,
         imageUrl: "../i-quit.png",
         imageSize: "400x150",
      });
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
  for (var i=0;i<6;i++)
    cnst.diceImg[i]=loadImage("../die"+(i+1)+".png");
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
  if (mode=="animation") {
// for now it's only dice animation
    if (pieceMoving.animateDice--) {                                  // if less then 1/2 sec, keep rolling
      if (pieceMoving.animateDice%6 == 0) {
        var before=gData.dice[0];
        gData.dice=[Math.floor(Math.random()*6)+1,Math.floor(Math.random()*6)+1];
        if (before) printDice(); else printBoard();                   // cause the "drow" button to disappear after dice started changing
      }
    }
    else {                                                            // end of dice animation
      gData.dice=[Math.floor(Math.random()*6)+1,Math.floor(Math.random()*6)+1];
      printDice();
      gData.moveCnt=0;
      gData.diceMoves=[0,0,0,0];
      if (!checkAnyMove()) {
        gData.currentPlayer=1-gData.currentPlayer;
        gData.dice=[0,0];
        gData.moveCnt=0;
        printBoard();
        gInfo.currentUID=gInfo.players[(gData.currentPlayer)?"Black":"White"].uid;
      }
      mode="active";
      db.ref("gameData/"+gInfo.game+"/"+gameID).set(gData);
      db.ref("gameInfo/"+gameID).set(gInfo);
    }
  }

}

function printDice() {
  var sizeDice=[cnst.diceSize*sizeSquare,cnst.diceSize*sizeSquare];

  switch (gData.moveCnt) {
    case 1:
      if (gData.dice[0]==gData.dice[1]) sizeDice[0]*=0.8;
      else sizeDice[0]*=0.5;
      break;
    case 3:
      sizeDice[1]*=0.8;
      // fallthrough
    case 2:
      sizeDice[0]*=0.5;
  }

  image(cnst.diceImg[gData.dice[0]-1],cnst.diceX1*sizeSquare, cnst.diceY*sizeSquare, sizeDice[0],sizeDice[0]);
  image(cnst.diceImg[gData.dice[1]-1],cnst.diceX2*sizeSquare, cnst.diceY*sizeSquare, sizeDice[1],sizeDice[1]);
}

/************************************************************************************************
*
*   Mouse behavior routines
*
************************************************************************************************/


void mousePressed () {
  debug(2,"mousePressed");
  if (!checkPlayer() || mode!="active") return;
  if (gData.dice[0]==0) {                                             // need to role dice
    var x=mouseX/sizeSquare, y=mouseY/sizeSquare;
    if (x>cnst.rollButton[0] && x<cnst.rollButton[0]+cnst.rollButton[2] && y>cnst.rollButton[1] && y<cnst.rollButton[1]+cnst.rollButton[3]) {
      mode="animation";
      pieceMoving.animateDice=60;
      pieceMoving.active=false;
      printBoard();
    }
  }
  else {                                                              // need to move pieces
    var mouse=mouseSquare();
    if (mouse>=0 && mouse <26 &&                                    // legal position
        gData.board[mouse]*cnst.dir[gData.currentPlayer] > 0 &&         // I need to click on my player's piece to start
        (checkMove(mouse, gData.dice[min(1,gData.moveCnt)]) >= 0 ||     // either this is a valid move with the current die...
         (gData.moveCnt==0 && checkMove(mouse, gData.dice[1]) >= 0))) { // ... or a valid move with other die (only for 1st move))
      pieceMoving.active=true;
      pieceMoving.from=mouse;
      gData.board[mouse]-=cnst.dir[gData.currentPlayer];
      printBoard();
      image(cnst.pieces[gData.currentPlayer],mouseX-sizeSquare*0.1,mouseY-sizeSquare*0.1,sizeSquare*0.2,sizeSquare*0.2);
    }
  }
}

void mouseDragged() {
  if (pieceMoving.active) {
    printBoard();
    image(cnst.pieces[gData.currentPlayer],mouseX-sizeSquare*0.1,mouseY-sizeSquare*0.1,sizeSquare*0.2,sizeSquare*0.2);
  }
}

void mouseReleased() {
  if (pieceMoving.active) {
    pieceMoving.active=false;
    var ok=true;
    var mouse=mouseSquare();
    if (mouse!=checkMove(pieceMoving.from, gData.dice[min(1,gData.moveCnt)])) {
      if (gData.moveCnt==0 && mouse==checkMove(pieceMoving.from, gData.dice[1])) {
        var tmp=gData.dice[0];
        gData.dice[0]=gData.dice[1];
        gData.dice[1]=tmp;
      }
      else ok=false;
    }

    if (ok) {
      if (gData.board[mouse]*cnst.dir[gData.currentPlayer] == -1) { // capture opponent piece
        gData.board[mouse]=cnst.dir[gData.currentPlayer];
        gData.board[25-gData.currentPlayer]-=cnst.dir[gData.currentPlayer];
      }
      else gData.board[mouse]+=cnst.dir[gData.currentPlayer];
      gData.diceMoves[gData.moveCnt]=pieceMoving.from;
      gData.moveCnt++;
      if (gData.moveCnt==4 || (gData.dice[0]!=gData.dice[1] && gData.moveCnt==2) || !checkAnyMove()) {              // used up all the dice or no legal move
        gData.currentPlayer=1-gData.currentPlayer;
        gData.dice=[0,0];
        gData.moveCnt=0;
      }
      db.ref("gameData/"+gInfo.game+"/"+gameID).set(gData);
      db.ref("gameInfo/"+gameID).set(gInfo);
    }
    else {
      gData.board[pieceMoving.from]+=cnst.dir[gData.currentPlayer];
    }
    printBoard();
  }
}

/************************************************************************************************
*
*   Service funtions (called by events)
*
************************************************************************************************/

//*************************************************************************************************
// Check if the move is valid based on piece type. retrun target slot (>=0) or -1 if can't
//*************************************************************************************************
int checkMove(from,count) {

  var target;
  var ok=true;

  if (from==(24+gData.currentPlayer))                               // try getting the captured piece back into play
    target=(gData.currentPlayer) ? count-1 : 24-count;
  else if (gData.board[24+gData.currentPlayer] != 0)                  // if there is a captued piece - can't move any other piece
    ok=false;
  else
    target=from+count*cnst.dir[gData.currentPlayer];

  if (ok) {
    if (target<0) {                                                   // Can white piece get out?
      var found=false;                                                // check if all white pieces are already at home
      for (var i=6; i<24; i++)
        if (gData.board[i]<0) found=true;
      if (!found && gData.board[24]==0) {                               // good, all white pieces are at home
        if (target == -1) target=26;                                  // exact move to out
        else {                                                        // ok to move out with large value only if no larger tiles
          var found=false;
          for (var i=5;i>from;i--)
            if (gData.board[i]<0) found=true;
          if (found) ok=false;
          else target=26;
        }
0      }
      else ok=false;                                                  // can't take piece out since not all white pieces are at home
    }
    else if (target>23) {                                             // Can black piece get out?
      var found=false;                                                // check if all white pieces are already at home
      for (var i=0; i<18; i++)
        if (gData.board[i]>0) found=true;
      if (!found && gData.board[25]==0) {                               // good, all white pieces are at home
        if (target == -1) target=27;                                  // exact move to out
        else {                                                        // ok to move out with large value only if no larger tiles
          var found=false;
          for (var i=19;i<from;i++)
            if (gData.board[i]>0) found=true;
          if (found) ok=false;
          else target=27;
        }
      }
      else ok=false;                                                  // can't take piece out since not all white pieces are at home
    }
    else                                                              // normal move
      if (gData.board[target]*cnst.dir[gData.currentPlayer] <  -1)        // target space occupied by 2+ opponent pieces ?
        ok=false;
  }
  if (!ok) target=-1;
  debug(2,"From:"+from+" Count:"+count+" Target:"+target);
  return target;
}

//*************************************************************************************************
// Check if there is any legal move for this player
//*************************************************************************************************
boolean checkAnyMove() {
  debug(2,"checkAnyMove");
  for (var i=0;i<26;i++) {
    if ( gData.board[i]*cnst.dir[gData.currentPlayer] >0 ) {
      if (checkMove(i, gData.dice[min(1,gData.moveCnt)]) >= 0 ) // valid move with current die
        return true;
      if (gData.moveCnt==0 && checkMove(i, gData.dice[1]) >= 0) // valid move with other die (only for 1st move)
        return true;
    }
  }
  debug(1,"no legal moves");
  return false;
}

//*************************************************************************************************
//   This function prints out the board based on the board array
//*************************************************************************************************
function printBoard() {
  size(sizeSquare*4,sizeSquare*3);
  image(cnst.boardImage,0,0,sizeSquare*4,sizeSquare*3);
  textFont(loadFont("Meta-Bold.ttf"));
  for (var i=0;i<24;i++) {
    var color=(gData.board[i]>0)?1:0;
    for (var j=0;j<abs(gData.board[i]);j++)
    {
      var l=bgLocation(i,j);
      image(cnst.pieces[color],l.x,l.y,sizeSquare*0.2,sizeSquare*0.2);
    }
  }
  for (var i=24;i<26;i++) {
    for (var j=0;j<abs(gData.board[i]);j++) {
      l=bgLocation(i,j);
      image(cnst.pieces[i-24],l.x,l.y,sizeSquare*0.2,sizeSquare*0.2);
    }
  }
  for (var i=26;i<28;i++) {
    for (var j=0;j<abs(gData.board[i]);j++) {
      l=bgLocation(i,j);
      image(cnst.sidepieces[i-26],l.x,l.y,sizeSquare*0.2,sizeSquare*0.1);
    }
  }

  if ($(".mdl-spinner").hasClass("is-active")) $(".mdl-spinner").removeClass("is-active");
  $("#backgammonBoard").show();
  $("#backgammonCanvas").show();
  if (gData.dice[0]==0) {                                             // no dice
    if (checkPlayer()) {                                              // Print "roll" button"
      fill(#CC6600);
      rect(cnst.rollButton[0]*sizeSquare,cnst.rollButton[1]*sizeSquare,cnst.rollButton[2]*sizeSquare,cnst.rollButton[3]*sizeSquare,sizeSquare);
      fill(#000000);
      text("Roll",(cnst.rollButton[0]+cnst.rollButton[2]*0.4)*sizeSquare,(cnst.rollButton[1]+cnst.rollButton[3]*0.6)*sizeSquare);
    }
  }
  else printDice();
}

function printRect(area) {
  fill(#FFCC00);
  rect(area[0]*sizeSquare,area[1]*sizeSquare,area[2]*sizeSquare,area[3]*sizeSquare);
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
  else n=(y)?26:27;
  return n;
}


//*************************************************************************************************
// Check is I'm currently playing.
// This is done comparing "player" (0-white, 1-black) with "mybackgammonIndex" (bitmap 0-none, 1-white, 2-black, 3-both)
//*************************************************************************************************
function checkPlayer() {
  if (gData.currentPlayer== -1) return false;
  var p= (1 << gData.currentPlayer);
  return (mybackgammonIndex & p)
}

//*************************************************************************************************
// Let the server know about a completed backgammon move (called after the user clicked on the destination spot
//*************************************************************************************************

function bgLocation(index,count) {
  var factor= (abs(gData.board[index])>6)?1:2;
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
    l.y=sizeSquare*((index==26) ? 2.80-count*0.05 : 0.1+count*0.05 );
  }
  return l;
}
