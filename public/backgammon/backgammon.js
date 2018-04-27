// the next line is very important for using images in JS
/* @pjs preload="../backgammon/p0White.png,../backgammon/p0Brown.png,../backgammon/p1White.png,../backgammon/p1Brown.png,../backgammon/p2White.png,../backgammon/p2Brown.png"; */

/************************************************************************************************
*
*   Define global variables
*
************************************************************************************************/
// -----------------------

var cnst={
  boardPic:[loadImage("../backgammon/board.jpg"),loadImage("../backgammon/boardR.jpg")],
  pieces:[],
  sidepieces:[[],[]],
  undoImg: loadImage("../undo.png"),
  diceImg:[0,0,0,0,0,0],
  boardStart:[2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-2,0,0,0,0],  // negative: white, positive: brown
//  boardStart:[2,0,0,0,0,-5,0,-3,0,0,0,5,-5,0,0,0,3,0,5,0,0,0,0,-2,0,0,0,0],  // negative: white, positive: brown
  dir:[-1,1],
  diceSize:0.2,
  rollButton:[2.7,0.95,1.4,0.4,0.2],
  undoX: 1.9,
  diceX:[2.5,0.8],
  diceY:1.4,
  pips:[[3.7,1.2,1.8],[0.15,1.82,1.22]],
};

var ignoreNextUpdate=0;
var gData={};
var gInfo={};

var pieceMoving={
  from:0,
  active:false,
  animateDice:0,
};

var reverse=0;                                                    // display reverse board for brown player
var mybackgammonIndex=0;                                              // 0 - no active player
                                                                      // 1 - White
                                                                      // 2 - Brown
                                                                      // 3 - Both (single player)

// Current backgammon board

// for each square on the board, boolean indication if there is a legal move for current player starting from it

var sizeSquare;                                                       // control the size and location of the board
var mode="passive";                                                   // "passive" - my player is not playing
                                                                      // "active" - player can roll dice or move pieces
                                                                      // "animation" - shows smooth movement of the piece or dice rolling

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
  $("#backgammonBoard .gameContent").css("width",sizeSquare*4);
  if($("#backgammonBoard").is(":visible")) printBoard();
});

//*************************************************************************************************
//   User selected to go to main menul
//*************************************************************************************************
$("#backgammonBoard .gameButtonClose").click( function() {
  newGID= -1;
  gameMsg="backgammon";
  $("#backgammonBoard").hide();
});

//*************************************************************************************************
//   User selected to quit (resign) the game
//*************************************************************************************************
$("#backgammonBoard .gameButtonEnd").click( function() {
  sweetAlert({
    title: "Are you sure?",
    text: "You will forfeit the game!",
    type: "warning",
    showCancelButton: true,
    confirmButtonClass: "btn-danger",
    confirmButtonText: "Yes, I quit!",
    cancelButtonText: "No, keep playing",
    confirmButtonColor: '#3085d6',
    cancelButtonColor: '#d33',
    closeOnConfirm: false
  },
  function(isConfirm) {
    if (isConfirm) {
      gInfo.status="quit";
      gInfo.concede=auth.currentUser.displayName;
      db.ref("gameData/"+gInfo.game+"/"+gameID).set(gData);
      db.ref("gameInfo/"+gameID).set(gInfo);
    } else {
      sweetAlert("Cancelled", "Keep Playing", "error");
    }
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
	playerList:[],
    currentPlayer:0,
    status:'pending'
  } ;
  gData={
    board: cnst.boardStart,
    moveCnt:0,
    diceMoves:[0,0,0,0],
    diceKills:[0,0,0,0],
    dice:[0,0],
//    pips:[24,24],
    pips:[167,167],
    points:[0,0],
    playTo:parseInt($("#backgammonPlayTo").val()),
  };
  gInfo.playerList.push({
	role:$("#backgammonRole").val(),
    uid:currentUID,
    displayName:auth.currentUser.displayName,
    photoURL:auth.currentUser.photoURL,
  });
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
$("#backgammonBoard .gameButtonJoin").click(function() {
  if (gInfo.status=="pending") {
    gInfo.playerList.push({
	  role:this.value,
	  uid:currentUID,
      displayName:auth.currentUser.displayName,
      photoURL:auth.currentUser.photoURL});
    gInfo.status="active"; // two-player game. Start automatically when the 2nd player joins
    gInfo.currentPlayer=0;
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

  $("#backgammonBoard .playerPics").empty();         // pictures of Players
  for (var p in gInfo.playerList) {
    var element= $("<div><img src='"+gInfo.playerList[p].photoURL+"'></div>");
    element.css('background',roleColors[gInfo.playerList[p].role]);
    element.css('border',"medium "+((gInfo.currentPlayer==p)?"solid":"none")+" red");
    element.prop('title', gInfo.playerList[p].displayName);
    $("#backgammonBoard .playerPics").append(element);
  }
  mybackgammonIndex=0;
  var i=1;
  for (var p in gInfo.playerList) {
	if (gInfo.playerList[p].uid==currentUID) mybackgammonIndex|=i;
	i=i*2;
  }
  debug(2,"mybackgammonIndex="+mybackgammonIndex);
  $("#backgammonBoard .gameButtonJoin").hide();
  if (mybackgammonIndex && gInfo.status!="quit")
    $("#backgammonBoard .gameButtonEnd").attr("disabled",false);
  else
    $("#backgammonBoard .gameButtonEnd").attr("disabled",true);
  $("#backgammonBoard .gameTurn").css("color","black");
  $("#backgammonBoard .gameTurn").html("");
  var color= (gInfo.playerList[0].role != "White") ? "White" : "Brown";
  cnst.pieces=[loadImage("../backgammon/p0"+gInfo.playerList[0].role+".png"),loadImage("../backgammon/p0"+color+".png")];
  cnst.sidepieces=[[loadImage("../backgammon/p1"+gInfo.playerList[0].role+".png"),loadImage("../backgammon/p1"+color+".png")],
				  [loadImage("../backgammon/p2"+gInfo.playerList[0].role+".png"),loadImage("../backgammon/p2"+color+".png")]];
  switch(gInfo.status) {
    case "pending":
      $("#backgammonBoard .gameButtonJoin").val(color);
      $("#backgammonBoard .gameButtonJoin").html("Join as "+color);
      $("#backgammonBoard .gameButtonJoin").show();
      mode="passive";
      printBoard();
      break;
    case "active":
      reverse=(mybackgammonIndex==2)?1:0;
      printBoard();
      if (checkPlayer()) $("#backgammonBoard .gameTurn").css("color","red");
      $("#backgammonBoard .gameTurn").html(gInfo.playerList[gInfo.currentPlayer].role+" player's turn");
      if (mode !="animation") mode="active";
      if (gData.special) {                                             // now need to check special messages or end conditions
        if (gData.special.endGame) {
          if (gData.pips[gInfo.currentPlayer]==0)
            sweetAlert({
               title: gInfo.playerList[gInfo.currentPlayer].role+" player won!",
               text: "",
               showConfirmButton: true,
               imageSize: "400x150",
            });
          if (mybackgammonIndex) {                                     // Mark player ready to end
            var updates= new Object();                                 // remove my Players from gameInfo
            for (var player in gInfo.playerList)
              if (gInfo.playerList[player].uid==currentUID)
                updates[player+'/uid']=0;
            db.ref("/gameInfo/"+gInfo.gid+"/playerList/").update(updates);
          }
        }
      }

      break;
    case "quit":
      sweetAlert({
         title: gInfo.concede+" had quit the game",
         text: "",
         showConfirmButton: true,
         imageUrl: "../i-quit.png",
         imageSize: "400x150",
      });
//      $("#backgammonBoard").hide();
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
  $("#backgammonBoard .gameContent").css("width",sizeSquare*4);
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
      gData.diceKills=[0,0,0,0];
      if (!checkAnyMove()) {
        gInfo.currentPlayer=1-gInfo.currentPlayer;
        gData.dice=[0,0];
        gData.moveCnt=0;
        printBoard();
        db.ref("gameInfo/"+gameID).set(gInfo);
      }
      mode="active";
      db.ref("gameData/"+gInfo.game+"/"+gameID).set(gData);
    }
  }

}

function printDice() {
  var currentSize=[cnst.diceSize*sizeSquare,cnst.diceSize*sizeSquare];

  switch (gData.moveCnt) {
    case 1:
      if (gData.dice[0]==gData.dice[1]) currentSize[0]*=0.8;
      else currentSize[0]*=0.5;
      break;
    case 3:
      currentSize[1]*=0.8;
      // fallthrough
    case 2:
      currentSize[0]*=0.5;
  }
  for (i=0;i<2;i++) {
    image(cnst.diceImg[gData.dice[i]-1],
          (cnst.diceX[gInfo.currentPlayer]+2*i*cnst.diceSize)*sizeSquare,
          cnst.diceY*sizeSquare,
          currentSize[i],currentSize[i]);
  }
  if (checkPlayer() && gData.moveCnt) {                   // show undo button
    image(cnst.undoImg,
          cnst.undoX*sizeSquare,
          cnst.diceY*sizeSquare,
          cnst.diceSize*sizeSquare,cnst.diceSize*sizeSquare);
  }
}

/************************************************************************************************
*
*   Mouse behavior routines
*
************************************************************************************************/


void mousePressed () {
  var x=mouseX/sizeSquare, y=mouseY/sizeSquare;
  if (!checkPlayer() || mode!="active") return;
  debug(2,"mousePressed");
  if (gData.dice[0]==0) {                                             // need to role dice
    if (x>cnst.rollButton[gInfo.currentPlayer] && x<cnst.rollButton[gInfo.currentPlayer]+cnst.rollButton[3] && y>cnst.rollButton[2] && y<cnst.rollButton[2]+cnst.rollButton[4]) {
      mode="animation";
      pieceMoving.animateDice=60;
      pieceMoving.active=false;
      printBoard();
    }
  }
  else {
    if (gData.moveCnt && x>cnst.undoX && x< cnst.undoX+cnst.diceSize && y> cnst.diceY && y<cnst.diceY+cnst.diceSize) { // undo button was pressed
      gData.moveCnt--;
      var dPips={val:0};                                                  // change in the number of pips
      var backTo=gData.diceMoves[gData.moveCnt];
      var backFrom=checkMove(backTo, gData.dice[min(1,gData.moveCnt)],dPips);
      gData.pips[gInfo.currentPlayer]+=dPips.val;
      gData.board[backTo]+=cnst.dir[gInfo.currentPlayer];
      gData.board[backFrom]-=cnst.dir[gInfo.currentPlayer];
      if (gData.diceKills[gData.moveCnt]) {
        gData.board[25-gInfo.currentPlayer]+=cnst.dir[gInfo.currentPlayer];
        gData.board[backFrom]=-cnst.dir[gInfo.currentPlayer];
      }
      db.ref("gameData/"+gInfo.game+"/"+gameID).set(gData);
      printBoard();
    }
    else {                                                            // need to move pieces
      var mouse=mouseSquare();
      if (mouse>=0 && mouse <26 &&                                    // legal position
        gData.board[mouse]*cnst.dir[gInfo.currentPlayer] > 0 &&           // I need to click on my player's piece to start
        (checkMove(mouse, gData.dice[min(1,gData.moveCnt)]) >= 0 ||       // either there is a valid move with the current die...
         (gData.moveCnt==0 && checkMove(mouse, gData.dice[1]) >= 0))) {   // ... or a valid move with other die (only for 1st move))
        pieceMoving.active=true;
        pieceMoving.from=mouse;
        gData.board[mouse]-=cnst.dir[gInfo.currentPlayer];
        printBoard();
        image(cnst.pieces[gInfo.currentPlayer],mouseX-sizeSquare*0.1,mouseY-sizeSquare*0.1,sizeSquare*0.2,sizeSquare*0.2);
      }
    }
  }
}

void mouseDragged() {
  if (pieceMoving.active) {
    printBoard();
    image(cnst.pieces[gInfo.currentPlayer],mouseX-sizeSquare*0.1,mouseY-sizeSquare*0.1,sizeSquare*0.2,sizeSquare*0.2);
  }
}

void mouseReleased() {
  var dPips={val:0};                                                  // change in the number of pips
  if (pieceMoving.active) {
    debug(2,"mouseReleased");
    pieceMoving.active=false;
    var ok=true;
    var mouse=mouseSquare();
    if (mouse!=checkMove(pieceMoving.from, gData.dice[min(1,gData.moveCnt)],dPips)) {
      if (gData.moveCnt==0 && mouse==checkMove(pieceMoving.from, gData.dice[1],dPips)) {
        var tmp=gData.dice[0];
        gData.dice[0]=gData.dice[1];
        gData.dice[1]=tmp;
      }
      else ok=false;
    }

    if (ok) {
      if (gData.board[mouse]*cnst.dir[gInfo.currentPlayer] == -1) { // capture opponent piece
        gData.pips[1-gInfo.currentPlayer]+=(gInfo.currentPlayer)?(24-mouse):(1+mouse);
        gData.board[mouse]=cnst.dir[gInfo.currentPlayer];
        gData.board[25-gInfo.currentPlayer]-=cnst.dir[gInfo.currentPlayer];
        gData.diceKills[gData.moveCnt]=1;
      }
      else {
        gData.board[mouse]+=cnst.dir[gInfo.currentPlayer];
        gData.diceKills[gData.moveCnt]=0;
      }
      gData.diceMoves[gData.moveCnt]=pieceMoving.from;
      gData.moveCnt++;
      gData.pips[gInfo.currentPlayer]-=dPips.val;
      if (gData.pips[gInfo.currentPlayer]==0) {
        gData.special={};
        gData.moveCnt=0;
        gData.special.endGame=true;
      }
      else if (gData.moveCnt==4 || (gData.dice[0]!=gData.dice[1] && gData.moveCnt==2) || !checkAnyMove()) {              // used up all the dice or no legal move
        gInfo.currentPlayer=1-gInfo.currentPlayer;
        gData.dice=[0,0];
        gData.moveCnt=0;
        db.ref("gameInfo/"+gameID).set(gInfo);
      }
      db.ref("gameData/"+gInfo.game+"/"+gameID).set(gData);
    }
    else {
      gData.board[pieceMoving.from]+=cnst.dir[gInfo.currentPlayer];
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
// dPips is sent by value to return the change in PIPs
//*************************************************************************************************
int checkMove(from,count,dPips) {

  var target;
  var ok=true;
  if (dPips) dPips.val=count;

  if (from==(24+gInfo.currentPlayer))                               // try getting the captured piece back into play
    target=(gInfo.currentPlayer) ? count-1 : 24-count;
  else if (gData.board[24+gInfo.currentPlayer] != 0)                  // if there is a captued piece - can't move any other piece
    ok=false;
  else
    target=from+count*cnst.dir[gInfo.currentPlayer];

  if (ok) {
    if (target<0) {                                                   // Can white piece get out?
      if (dPips) dPips.val=from+1;
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
      }
      else ok=false;                                                  // can't take piece out since not all white pieces are at home
    }
    else if (target>23) {                                             // Can Brown piece get out?
      if (dPips) dPips.val=24-from;
      var found=false;                                                // check if all white pieces are already at home
      for (var i=0; i<18; i++)
        if (gData.board[i]>0) found=true;
      if (!found && gData.board[25]==0) {                             // good, all white pieces are at home
        if (target == 24) target=27;                                  // exact move to out
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
      if (gData.board[target]*cnst.dir[gInfo.currentPlayer] <  -1)        // target space occupied by 2+ opponent pieces ?
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
    if ( gData.board[i]*cnst.dir[gInfo.currentPlayer] >0 ) {
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
  image(cnst.boardPic[reverse],0,0,sizeSquare*4,sizeSquare*3);
  textFont(loadFont("Meta-Bold.ttf"));
  for (var i=0;i<24;i++) {
    var color=(gData.board[i]>0)?1:0;
    for (var j=0;j<abs(gData.board[i]);j++)
    {
      var l=bgLocation(i,j);
      image(cnst.pieces[color],l.x,l.y,l.sx,l.sy);
    }
  }
  for (var i=24;i<26;i++) {
    for (var j=0;j<abs(gData.board[i]);j++) {
      l=bgLocation(i,j);
      image(cnst.pieces[i-24],l.x,l.y,l.sx,l.sy);
    }
  }
  for (var j=0;j<abs(gData.board[26]);j++) {
    l=bgLocation(26,j);
    image(cnst.sidepieces[reverse][0],l.x,l.y,l.sx,l.sy);
  }
  for (var j=0;j<abs(gData.board[27]);j++) {
    l=bgLocation(27,j);
    image(cnst.sidepieces[1-reverse][1],l.x,l.y,l.sx,l.sy);
  }

  if ($(".mdl-spinner").hasClass("is-active")) $(".mdl-spinner").removeClass("is-active");
  $("#backgammonBoard").show();
  $("#backgammonCanvas").show();
  if (gData.dice[0]==0) {                                             // no dice
    if (checkPlayer()) {                                              // Print "roll" button"
      fill(#CC6600);
      rect(cnst.rollButton[gInfo.currentPlayer]*sizeSquare,cnst.rollButton[2]*sizeSquare,cnst.rollButton[3]*sizeSquare,cnst.rollButton[4]*sizeSquare,sizeSquare);
      fill(#000000);
      text("Roll",(cnst.rollButton[gInfo.currentPlayer]+cnst.rollButton[3]*0.4)*sizeSquare,(cnst.rollButton[2]+cnst.rollButton[4]*0.6)*sizeSquare);
    }
  }
  else printDice();
  text(gData.pips[0],sizeSquare*cnst.pips[reverse][0], sizeSquare*cnst.pips[reverse][1]);
  text(gData.pips[1],sizeSquare*cnst.pips[reverse][0], sizeSquare*cnst.pips[reverse][2]);
}

function printRect(area) {
  fill(#FFCC00);
  rect(area[0]*sizeSquare,area[1]*sizeSquare,area[2]*sizeSquare,area[3]*sizeSquare);
}


//*************************************************************************************************
// return object with board coordinate of the mouse - if it's inside the board
//*************************************************************************************************
function mouseSquare()
{
  var x=Math.floor(mouseX/sizeSquare/0.236)-2;
  var y=Math.floor(mouseY/sizeSquare/1.5);
  if (reverse) {
    y=1-y;
    x=12-x;
  }
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
//*************************************************************************************************
function checkPlayer() {
  return (gInfo.playerList[gInfo.currentPlayer].uid==currentUID);
}

//*************************************************************************************************
//
//*************************************************************************************************

function bgLocation(index,count) {
  var factor= (abs(gData.board[index])>6)?1:2;
  var l={x:0,y:0,sx:sizeSquare*0.2,sy:sizeSquare*0.2};
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
    l.sy=sizeSquare*0.1;
  }
  if (reverse) {
    l.x=4*sizeSquare-l.sx-l.x;
    l.y=3*sizeSquare-l.sy-l.y;
  }
  return l;
}
