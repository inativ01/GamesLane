// the next line is very important for using images in JS
/* @pjs preload="../pics/BG-p0White.png,../pics/BG-p0Brown.png,../pics/BG-p1White.png,../pics/BG-p1Brown.png,../pics/BG-p2White.png,../pics/BG-p2Brown.png"; */

/************************************************************************************************
*
*   Define global variables
*
************************************************************************************************/
// -----------------------

var cnst={
  boardPic:[loadImage("../pics/BG-board.jpg"),loadImage("../pics/BG-boardR.jpg")],
  pieces:[],
  sidepieces:[[],[]],
  diceImg:[0,0,0,0,0,0],
//  boardStart:[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-1,0,0,0,0],  // negative: white, positive: brown
  boardStart:[2,0,0,0,0,-5,0,-3,0,0,0,5,-5,0,0,0,3,0,5,0,0,0,0,-2,0,0,0,0],  // negative: white, positive: brown
  dir:[-1,1],
  diceSize:20,
  rollButton:[270,95,140,40,20],  // X right, X left, Y, X size, Y size
  dice:[250,80,140], // X right, X left, Y
  doubleDie:[370,10,140,20],   // X, X reverse, Y, size
};

var pieceMoving={
  from:0,
  to:[],
  active:false,
  animateDice:0,
};

var reverse=0;                                                    // display reverse board for brown player
var mybackgammonIndex;                                              // array of active players

// Current backgammon board

// for each square on the board, boolean indication if there is a legal move for current player starting from it

var pixelSize;                                                        // translate game pixes to real pixels
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
  pixelSize=Math.min(window.innerWidth/400,(window.innerHeight-60)/300);
  $("#backgammonBoard .gameContent").css("width",pixelSize*400);
  if($("#backgammonBoard").is(":visible")) printBoard();
});

//*************************************************************************************************
//   Undo last move
//*************************************************************************************************
$("#backgammonBoard .gameButtonUndo").click( function() {
  gData.moveCnt--;
  var dPips={val:0};                                                  // change in the number of pips
  var backTo=gData.diceMoves[gData.moveCnt];
  var backFrom=checkMove(backTo, gData.dice[min(1,gData.moveCnt)],dPips);
  gData.pips[gInfo.currentPlayer]+=dPips.val;
  gData.board[backTo]+=cnst.dir[gInfo.currentPlayer];
  gData.board[backFrom]-=cnst.dir[gInfo.currentPlayer];
  if (gData.diceKills[gData.moveCnt]) {
  gData.board[25-gInfo.currentPlayer]+=cnst.dir[gInfo.currentPlayer];  // slot 24,25 for the Bar
  gData.board[backFrom]=-cnst.dir[gInfo.currentPlayer];
  }
  db.ref("gameData/"+gInfo.game+"/"+gameID).set(gData);
  printBoard();
});

//*************************************************************************************************
//   User selected to quit (resign) the game
//*************************************************************************************************
$("#backgammonBoard .gameButtonEnd").click( function() {
  swal({
    title: "Are you sure?",
    text: "You will forfeit the "+((gData.playTo==1)?"game":"entire match"),
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
      gInfo.concede=auth.currentUser.displayName;
      db.ref("gameInfo/"+gameID).set(gInfo);
      db.ref("gameData/"+gInfo.game+"/"+gameID).set(gData);
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
  do {
    newGID=Math.floor(Math.random() * (1000000000000))+1;
  } while (gameInfo[newGID]); // need to try again just in case the GID is taken
  gInfo={
    game:"backgammon",
    gid:newGID,
    playerList:[],
    currentPlayer:0,
    status:'pending'
  } ;
  gdataInit(true);
  gInfo.playerList.push({
    role:$("#backgammonRole").val(),
    uid:currentUID,
    displayName:auth.currentUser.displayName,
    photoURL:auth.currentUser.photoURL,
  });
  db.ref("gameInfo/"+newGID).set(gInfo);
  db.ref("gameData/"+gInfo.game+"/"+newGID).set(gData);
  gameMsg="backgammon";
  $("#backgammonOptionsBoard").hide();
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
//  gInfo=gData.info;
  gInfo=gameInfo[gameID];
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
    element.prop('title', gInfo.playerList[p].displayName+" [PIPS="+gData.pips[p]+((gData.playTo>1)?", Score="+gData.points[p]:"")+"]");
    $("#backgammonBoard .playerPics").append(element);
  }
  if (swal && swal.getState().isOpen) debug(0,swal.close());  // if there is an open SweetAlert window, close it
  mybackgammonIndex=[];
  for (var p in gInfo.playerList) {
    if (gInfo.playerList[p].uid==currentUID) mybackgammonIndex.push(parseInt(p));
  }
  debug(2,"mybackgammonIndex="+mybackgammonIndex);
  $("#sjButtons").hide();
  $("#gameButtonJoin").hide();
  $("#gameButtonStart").hide();
  $("#backgammonBoard .gameButtonUndo").hide();
  if (mybackgammonIndex.length && gInfo.status!="quit")
    $("#backgammonBoard .gameButtonEnd").attr("disabled",false);
  else
    $("#backgammonBoard .gameButtonEnd").attr("disabled",true);
  $("#backgammonBoard .gameTurn").css("color","black");
  $("#backgammonBoard .gameTurn").html("");
  var color= (gInfo.playerList[0].role != "White") ? "White" : "Brown";
  cnst.pieces=[loadImage("../pics/BG-p0"+gInfo.playerList[0].role+".png"),loadImage("../pics/BG-p0"+color+".png")];
  cnst.sidepieces=[[loadImage("../pics/BG-p1"+gInfo.playerList[0].role+".png"),loadImage("../pics/BG-p1"+color+".png")],
    [loadImage("../pics/BG-p2"+gInfo.playerList[0].role+".png"),loadImage("../pics/BG-p2"+color+".png")]];
  switch(gInfo.status) {
    case "pending":
      $("#gameButtonJoin").val(color);
      $("#gameButtonJoin").html("Join as "+color);
      $("#gameButtonJoin").show();
      $("#sjButtons").show();
      mode="passive";
      printBoard();
      break;

    case "active":
      reverse=(mybackgammonIndex.length==1 && mybackgammonIndex[0]==1)?1:0;
      printBoard();
      if (checkPlayer()) {
        $("#backgammonBoard .gameTurn").css("color","red");
        if (gData.moveCnt) $("#backgammonBoard .gameButtonUndo").show(); 
      }
      $("#backgammonBoard .gameTurn").html(gInfo.playerList[gInfo.currentPlayer].role+" player's turn");
      if (mode !="animation") mode="active";
      if (gData.special) {                                             // now need to check special messages or end conditions
        if (gData.special.endGame) {
          if (gData.points[gInfo.currentPlayer] < gData.playTo) {
            sweetAlert({
              title: gInfo.playerList[gInfo.currentPlayer].role+" player win round",
              text: gData.special.msg+"\n\nCurrent Scores: (out of "+gData.playTo+")\nWhite: "+gInfo.playerList[0].displayName+" - "+gData.points[0]+"\nBrown: "+gInfo.playerList[1].displayName+" - "+gData.points[1],
            }); 
          }
          else {
            sweetAlert({
              title: gInfo.playerList[gInfo.currentPlayer].role+" player won!",
              text: (gData.playTo==1)?"":gData.special.msg+"\n\nFinal Scores:\nWhite: "+gInfo.playerList[0].displayName+" - "+gData.points[0]+"\nBrown: "+gInfo.playerList[1].displayName+" - "+gData.points[1],
              showConfirmButton: true,
              icon: "../pics/winner-gold-ribbon.png",
            }); 
            if (mybackgammonIndex.length) {                                     // Mark player ready to end
              var updates= new Object();                                 // remove my Players from gameInfo
              for (var player in gInfo.playerList)
                if (gInfo.playerList[player].uid==currentUID)
                  updates[player+'/uid']=0;
              db.ref("/gameInfo/"+gInfo.gid+"/playerList/").update(updates);
            }
            newGID= 0;
            gameMsg="backgammon";
            $("#backgammonBoard").hide();
          }
        }
        else if (gData.special.doubleRequest) {
          debug(2,"Double request");
          if (mybackgammonIndex.includes(1-gInfo.currentPlayer)) { // this is the player that needs to respond to the double request
            swal({
              title: "Double",
              text: "Accept it?",
              icon: "warning",
              dangerMode: true,
              buttons: {
                dbl: {
                  visible: true,
                  text: "Let's Double",
                  closeModal: true,
                  value:false,
                },
                frft: {
                  text: "No double, I forfeit this round",
                  closeModal: true,
                  value:true,
                },
              },
              closeOnClickOutside:false,
              closeOnEsc:false
            })
            .then(function(value){
              if (value) {
                endGame(false);
                db.ref("gameData/"+gInfo.game+"/"+gameID).set(gData);
              }
              else {
                gData.special=null;
                gData.canDouble=[(1-gInfo.currentPlayer)];
                gData.doubleDie *=2;
                db.ref("gameData/"+gInfo.game+"/"+gameID).set(gData);
              }
            })
          }
          else { // all other players need to wait for double approval
            swal({
              title: "Double request",
              text: "Please wait for approval",
              buttons: false,
              closeOnClickOutside:false,
              closeOnEsc:false
            });
          }
        }
      }
      break;

    case "quit":
      swal({
        title: gInfo.concede+" had quit the game",
        text: "  ",
        buttons: false,
        icon: "../pics/swal-quit.jpg",
        timer: 2000,
      });
      newGID= 0;
      gameMsg="backgammon";
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
  textSize(7);
  pixelSize=Math.min(window.innerWidth/4,(window.innerHeight-60)/3)/100;
  $("#backgammonBoard .gameContent").css("width",pixelSize*400);
  for (var i=0;i<6;i++)
    cnst.diceImg[i]=loadImage("../pics/die"+(i+1)+".png");
}

//*************************************************************************************************
// Loop - called 60 times per second
//*************************************************************************************************
void draw() {

// gameMsg is set when a user enters or leaves a specific game
  if (gameMsg == "backgammon") {
    debug(2,"New:"+newGID+" Old:"+gameID);
// user left the game. Stop listening to firebase events related to this game
    if (gameID) {
      db.ref("gameData/backgammon/"+gameID).off();
      db.ref("gameChat/backgammon/"+gameID).off();
    }
// user entered the game (either as player or watcher). Start listening to firebase events related to this game
    gameID=newGID;
    if (gameID) {
      currentGame=gameMsg;
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
        if (before) printDice(); else printBoard();                   // cause the "draw" button to disappear after dice started changing
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
      gData.special=null;
      db.ref("gameData/"+gInfo.game+"/"+gameID).set(gData);
    }
  }

}

function printDice() {
  var currentSize=[cnst.diceSize,cnst.diceSize];

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
          (cnst.dice[gInfo.currentPlayer]+2*i*cnst.diceSize),
          cnst.dice[2],
          currentSize[i],currentSize[i]);
  }
}

/************************************************************************************************
*
*   Mouse behavior routines
*
************************************************************************************************/


void mousePressed () {
  if (pieceMoving.active) {
    debug(0,"ignore press");
    return;
  }
  var x=mouseX/pixelSize, y=mouseY/pixelSize;
  if (!checkPlayer() || mode!="active") return;
  debug(2,"mousePressed");
  if (gData.dice[0]==0) {                                             // need to role dice
                                  // roll button clicked
    if (x>cnst.rollButton[gInfo.currentPlayer] && x<cnst.rollButton[gInfo.currentPlayer]+cnst.rollButton[3] && y>cnst.rollButton[2] && y<cnst.rollButton[2]+cnst.rollButton[4]) {
      mode="animation";
      pieceMoving.animateDice=60;
      pieceMoving.active=false;
      printBoard();
    }
                                  // double die clicked
    else if (gData.canDouble.includes(gInfo.currentPlayer) && x>cnst.doubleDie[reverse] && x<cnst.doubleDie[reverse]+cnst.doubleDie[3] && y>cnst.doubleDie[2] && y<cnst.doubleDie[2]+cnst.doubleDie[3]) {
      gData.special={doubleRequest:true}; // request to double the die
      db.ref("gameData/"+gInfo.game+"/"+gameID).set(gData);
    }
  }
  else {
    var mouse=mouseSquare();
    if (mouse>=0 && mouse <26 &&                                    // legal position
      gData.board[mouse]*cnst.dir[gInfo.currentPlayer] > 0 &&           // I need to click on my player's piece to start
      (checkMove(mouse, gData.dice[min(1,gData.moveCnt)]) >= 0 ||       // either there is a valid move with the current die...
       (gData.moveCnt==0 && checkMove(mouse, gData.dice[1]) >= 0))) {   // ... or a valid move with other die (only for 1st move))
      pieceMoving.active=true;
      pieceMoving.from=mouse;
      var l=checkMove(pieceMoving.from, gData.dice[min(1,gData.moveCnt)]);
      if (l>=0) pieceMoving.to=[l];
      if (gData.moveCnt==0 && gData.dice[0]!=gData.dice[1]) {
        l=checkMove(pieceMoving.from, gData.dice[1]);
        if (l>=0) pieceMoving.to.push(l);
      }
      debug(3,pieceMoving);
      gData.board[mouse]-=cnst.dir[gInfo.currentPlayer];
      printBoard();
      image(cnst.pieces[gInfo.currentPlayer],mouseX/pixelSize-10,mouseY/pixelSize-10,20,20);
    }
  }
}

void mouseDragged() {
  if (pieceMoving.active) {
    printBoard();
    image(cnst.pieces[gInfo.currentPlayer],mouseX/pixelSize-10,mouseY/pixelSize-10,20,20);
  }
}

void mouseMoved() {
  if (pieceMoving.active) {
    printBoard();
    image(cnst.pieces[gInfo.currentPlayer],mouseX/pixelSize-10,mouseY/pixelSize-10,20,20);
  }
}

void mouseReleased() {
  var dPips={val:0};                                                  // change in the number of pips
  if (pieceMoving.active) {
    debug(2,"mouseReleased");
    var mouse=mouseSquare();
    if (mouse==pieceMoving.from) {
      debug(0,"no move");
      return;
    }
    pieceMoving.active=false;
    var ok=true;
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
    endGame(true);
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
      printBoard();
    }
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
  debug(3,"printBoard");
  size(pixelSize*400,pixelSize*300);
  scale(pixelSize,pixelSize); 
  image(cnst.boardPic[reverse],0,0,400,300);
  textFont(loadFont("Meta-Bold.ttf"));
  // print pieces on the board
  for (var i=0;i<24;i++) {
    var color=(gData.board[i]>0)?1:0;
    for (var j=0;j<abs(gData.board[i]);j++)
    {
      var l=bgLocation(i,j);
      image(cnst.pieces[color],l.x,l.y,l.sx,l.sy);
    }
  }

  // print pieces on the bar
  for (var i=24;i<26;i++) {
    for (var j=0;j<abs(gData.board[i]);j++) {
      l=bgLocation(i,j);
      image(cnst.pieces[i-24],l.x,l.y,l.sx,l.sy);
    }
  }

  // print pieces on the outside
  for (var j=0;j<abs(gData.board[26]);j++) {
    l=bgLocation(26,j);
    image(cnst.sidepieces[reverse][0],l.x,l.y,l.sx,l.sy);
  }
  for (var j=0;j<abs(gData.board[27]);j++) {
    l=bgLocation(27,j);
    image(cnst.sidepieces[1-reverse][1],l.x,l.y,l.sx,l.sy);
  }

  // if during a move, point out valid target
  if (pieceMoving.active) {
    for (var i in pieceMoving.to) {
      var l=bgLocation(pieceMoving.to[i],-1);
      fill(#00ff00);
      ellipse(l.x+l.sx/2,l.y+l.sy/2,l.sx/4,l.sx/4);
    }
  } 
  
  $("#backgammonBoard").show();
  $("#backgammonCanvas").show();
  var doubleActive=false;

  // Print "roll" button"
  if (gData.dice[0]==0) {                                             // no dice
    if (checkPlayer() && gInfo.status=="active") {                                              
      fill(#CC6600);
      rect(cnst.rollButton[gInfo.currentPlayer],cnst.rollButton[2],cnst.rollButton[3],cnst.rollButton[4],100);
      fill(#000000);
      text("Roll",cnst.rollButton[gInfo.currentPlayer]+cnst.rollButton[3]*0.35,cnst.rollButton[2]+cnst.rollButton[4]*0.65);
      if (gData.canDouble.includes(gInfo.currentPlayer)) doubleActive=true;
    }
  }
  // Print dice
  else printDice();

  // pring doubling cube
  if (doubleActive) stroke (#FF0000);
  fill(#FFFFFF);
  rect(cnst.doubleDie[reverse], cnst.doubleDie[2], cnst.doubleDie[3], cnst.doubleDie[3],5);
  fill(#000000);
  text(gData.doubleDie,cnst.doubleDie[reverse]+cnst.doubleDie[3]*0.4,cnst.doubleDie[2]+cnst.doubleDie[3]*0.65);
  stroke(0);
}

//*************************************************************************************************
// Initialize gData
//*************************************************************************************************
function gdataInit(first) {
  var points=[0,0];
  var playTo=parseInt($("#backgammonPlayTo").val());
  var pips=0;
  if (!first) {
    points=gData.points;
    playTo:gData.playTo;
  }
  for (var i=0;i<24; i++) 
    if (cnst.boardStart[i]>0) pips += (24-i)*cnst.boardStart[i];
  
  gData={
//    info:gInfo,
    board: cnst.boardStart,
    moveCnt:0,
    diceMoves:[0,0,0,0],
    diceKills:[0,0,0,0],
    dice:[0,0],
    doubleDie:1, 
    canDouble:[0,1],
    points:points,
    playTo:playTo,
    pips:[pips,pips],
    toggle:0,
  }; 
}


//*************************************************************************************************
// Activity when the round is over
//*************************************************************************************************

function endGame(bonus) {
  debug(2,"End of the round");
  // calculate how many points were won.
  var pt=0, msg=gData.doubleDie+"x ";
  if (gData.board[27-gInfo.currentPlayer]==0 && bonus) {
    if (gData.board[25-gInfo.currentPlayer]>0) { // opponent piece on the bar
    pt=gData.doubleDie*4;                   // Double Backgammon
    msg+="Double Backgammon (4) = "+pt;
    }
    else {
    var empty=true;  // check if any opponent piece at home
    for (var i=0;i<6;i++) {
      if (gData.board[gInfo.currentPlayer*18+i]!=0) empty=false;
    }
    if (empty) {
      pt=gData.doubleDie*2;  // Gammon
      msg+="Gammon (2) = "+pt;
    }
    else {
      pt=gData.doubleDie*3;      // Backgammon
      msg+="Backgammon (3) = "+pt;
    }
    }        
  }
  else {
    pt=gData.doubleDie;          // Standard win
    msg+="Simple win (1) = "+pt;
  }
  gData.points[gInfo.currentPlayer]+=pt;
  gdataInit(false);
  gData.special= {
    endGame:true,
    msg:msg,
  }
}

//*************************************************************************************************
// return object with board coordinate of the mouse - if it's inside the board
//*************************************************************************************************
function mouseSquare()
{
  var x=Math.floor(mouseX/pixelSize/23.6)-2;
  var y=Math.floor(mouseY/pixelSize/150);
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
  var factor= (abs(gData.board[index])>6)?10:20;
  var l={x:0,y:0,sx:20,sy:20};
  if (index<24) {
    if (index<12)
      l.y=265-count*factor;
    else
      l.y=15+count*factor;
    i1=index%6;
    switch ((index-i1)/6) {
      case 0:
        l.x=330-i1*23;
        break;
      case 1:
        l.x=167-i1*23;
        break;
      case 2:
        l.x=50+i1*23;
        break;
      case 3:
        l.x=215+i1*23;
        break;
    }
  }
  else if (index<26) {   // "eaten" pieces
    l.x=190;
    l.y=(index==24) ? 120-count*factor : 160+count*factor;
  }
  else {                 // completed pieces
    l.x=370;
    l.y=(index==26) ? 280-count*5 : 10+count*5 ;
    l.sy=10;
  }
  if (reverse) {
    l.x=400-l.sx-l.x;
    l.y=300-l.sy-l.y;
  }
  return l;
}
