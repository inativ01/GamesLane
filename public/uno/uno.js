/************************************************************************************************
*
*   Define global variables
*
************************************************************************************************/
// -----------------------

var cnst={
};

var gData={};
var gInfo={};

var myunoIndex=0;                                              // 0 - no active player
                                                                      // 1 - White
                                                                      // 2 - Brown
                                                                      // 3 - Both (single player)

// Current uno board

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
  $("#unoBoard .gameContent").css("width",sizeSquare*4);
  if($("#unoBoard").is(":visible")) printBoard();
});

//*************************************************************************************************
//   User selected to go to main menu
//*************************************************************************************************
$("#unoBoard .gameButtonClose").click( function() {
  newGID= -1;
  gameMsg="uno";
  $("#unoBoard").hide();
});

//*************************************************************************************************
//   User selected to quit (resign) the game
//*************************************************************************************************
$("#unoBoard .gameButtonEnd").click( function() {
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
$("#unoNewButton").click( function() {
  if (!auth.currentUser.isAnonymous) {
    mode="passive";
    $("#unoOptionsBoard").show();
    $("#unoOptionsHeader").show();
    mode="passive";
  }
});

//*************************************************************************************************
//   exit the Options screen and don't start the game
//*************************************************************************************************
$("#unoCancelOptions").click(function() {
    $("#unoOptionsBoard").hide();
});

//*************************************************************************************************
//   done with Options, start the game
//*************************************************************************************************
$('#unoStartButton').click(function() {
  newGID=Math.floor(Math.random() * (1000000000000));
  gInfo={
    game:"uno",
    gid:newGID,
    playerList:[],
    currentPlayer:0,
    status:'pending'
  } ;
  gData={
    moveCnt:0,
    diceMoves:[0,0,0,0],
    diceKills:[0,0,0,0],
    dice:[0,0],
    points:[0,0],
  };
  gInfo.playerList.push({
	role:$("#unoRole").val(),
    uid:currentUID,
    displayName:auth.currentUser.displayName,
    photoURL:auth.currentUser.photoURL,
  });
  gData.info=gInfo;
  db.ref("gameData/"+gInfo.game+"/"+newGID).set(gData);
  db.ref("gameInfo/"+newGID).set(gInfo);
  gameMsg="uno";
  $("#unoOptionsBoard").hide();
  $(".mdl-spinner").addClass("is-active");
});


//*************************************************************************************************
//   User selected to join the game as a player [!!! COMMON Function]
//*************************************************************************************************
$("#unoBoard .gameButtonJoin").click(function() {
  if (gInfo.status=="pending") {
    gInfo.playerList.push({
	  role:this.value,
	  uid:currentUID,
      displayName:auth.currentUser.displayName,
      photoURL:auth.currentUser.photoURL});
    gInfo.status="active";
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
// This function is called when the server updates gameData/uno/<gid> for the current game
//*************************************************************************************************

function unoEvent(snapshot) {
  if (!snapshot.val()) return; // information not ready yet
  gData=jQuery.extend(true, {}, snapshot.val()); // copy of gameData from database
  gInfo=gData.info;
  if (gameID != gInfo.gid) {
    debug(0,"Incorrect Game ID:"+gInfo.gid+"/"+gameID);
    return;
  }
  debug(1,"unoMove GID="+gameID+" status="+gInfo.status);
  debug(2,gData);
  debug(2,gInfo);
  $("#unoBoard .playerPics").empty();         // pictures of Players
  for (var p in gInfo.playerList) {
    var element= $("<div><img src='"+gInfo.playerList[p].photoURL+"'></div>");
    element.css('background',roleColors[gInfo.playerList[p].role]);
    element.css('border',"medium "+((gInfo.currentPlayer==p)?"solid":"none")+" red");
    element.prop('title', gInfo.playerList[p].displayName);
    $("#unoBoard .playerPics").append(element);
  }
  myunoIndex=0;
  var i=1;
  for (var p in gInfo.playerList) {
	if (gInfo.playerList[p].uid==currentUID) myunoIndex|=i;
	i=i*2;
  }
  debug(2,"myunoIndex="+myunoIndex);
  $("#unoBoard .gameButtonJoin").hide();
  if (myunoIndex && gInfo.status!="quit")
    $("#unoBoard .gameButtonEnd").attr("disabled",false);
  else
    $("#unoBoard .gameButtonEnd").attr("disabled",true);
  $("#unoBoard .gameTurn").css("color","black");
  $("#unoBoard .gameTurn").html("");
  switch(gInfo.status) {
    case "pending":
      var color= (gInfo.playerList[0].role != "White") ? "White" : "Brown";
      $("#unoBoard .gameButtonJoin").val(color);
      $("#unoBoard .gameButtonJoin").html("Join as "+color);
      $("#unoBoard .gameButtonJoin").show();
      mode="passive";
      printBoard();
      break;
    case "active":
      printBoard();
      if (checkPlayer()) $("#unoBoard .gameTurn").css("color","red");
      $("#unoBoard .gameTurn").html(gInfo.playerList[gInfo.currentPlayer].role+" player's turn");
      if (mode !="animation") mode="active";
      if (gData.special) {                                             // now need to check special messages or end conditions
        if (gData.special.endGame) {
          if (myunoIndex) {                                     // Mark player ready to end
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
//      $("#unoBoard").hide();
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
  $("#unoBoard .gameContent").css("width",sizeSquare*4);
  size(sizeSquare*4,sizeSquare*3);
}

//*************************************************************************************************
// Loop - called 60 times per second
//*************************************************************************************************
void draw() {

// gameMsg is set when a user enters or leaves a specific game
  if (gameMsg == "uno") {
    debug(2,"New:"+newGID+" Old:"+gameID);
// user left the game. Stop listening to firebase events related to this game
    if (gameID != -1) {
      db.ref("gameData/uno/"+gameID).off();
      db.ref("gameChat/uno/"+gameID).off();
    }
// user entered the game (either as player or watcher). Start listening to firebase events related to this game
    gameID=newGID;
    if (gameID != -1) {
// Server updated the game information
      db.ref("gameData/uno/"+gameID).on("value", unoEvent);
// Chat messages related to this game
      db.ref("gameChat/uno/"+gameID).on("child_added", function(snapshot) {
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

}


/************************************************************************************************
*
*   Mouse behavior routines
*
************************************************************************************************/


void mousePressed () {
}

void mouseDragged() {
}

void mouseReleased() {
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
}




