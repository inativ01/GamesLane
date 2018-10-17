/************************************************************************************************
*
*   Define global variables
*
************************************************************************************************/
// -----------------------

var cnst={
};

var myGAMEIndex;                                              // array of active players

// Current GAME board

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
  pixelSize=Math.min(window.innerWidth,(window.innerHeight-60))/1000;
  $("#GAMEBoard .gameContent").css("width",pixelSize*1000);
  if($("#GAMEBoard").is(":visible")) printBoard();
});


//*************************************************************************************************
//   go to the game Options screen
//*************************************************************************************************
$("#GAMENewButton").click( function() {
  if (!auth.currentUser.isAnonymous) {
    mode="passive";
    $("#GAMEOptionsBoard").show();
    $("#GAMEOptionsHeader").show();
    mode="passive";
  }
});

//*************************************************************************************************
//   exit the Options screen and don't start the game
//*************************************************************************************************
$("#GAMECancelOptions").click(function() {
    $("#GAMEOptionsBoard").hide();
});

//*************************************************************************************************
//   done with Options, start the game
//*************************************************************************************************
$('#GAMEStartButton').click(function() {
  do {
    newGID=Math.floor(Math.random() * (1000000000000))+1;
  } while (gameInfo[newGID]); // need to try again just in case the GID is taken
  gInfo={
    game:"GAME",
    gid:newGID,
    playerList:[],
    currentPlayer:0,
    status:'pending'
  } ;
  gData={
    // ### specific fields for this game
    toggle:0,
    playTo:1,
  };
  gInfo.playerList.push({
  role:$("#GAMERole").val(), // ### assuming that a role was defined in the game options
    role:0,
    uid:currentUID,
    displayName:auth.currentUser.displayName,
    photoURL:auth.currentUser.photoURL,
  });
  db.ref("gameInfo/"+newGID).set(gInfo);
  db.ref("gameData/"+gInfo.game+"/"+newGID).set(gData);
  gameMsg="GAME";
  $("#GAMEOptionsBoard").hide();
  $(".mdl-spinner").addClass("is-active");
});


/************************************************************************************************
*
*   Firebase events
*
************************************************************************************************/

//*************************************************************************************************
// This function is called when the server updates gameData/GAME/<gid> for the current game
//*************************************************************************************************

function GAMEEvent(snapshot) {
  if (!snapshot.val()) return; // information not ready yet
  gData=jQuery.extend(true, {}, snapshot.val()); // copy of gameData from database
  gInfo=gameInfo[gameID];
  if (gameID != gInfo.gid) {
    debug(0,"Incorrect Game ID:"+gInfo.gid+"/"+gameID);
    return;
  }
  debug(1,"GAMEMove GID="+gameID+" status="+gInfo.status);
  debug(2,gData);
  debug(2,gInfo);
  $("#GAMEBoard .playerPics").empty();         // pictures of Players
  for (var p in gInfo.playerList) {
    var element= $("<div><img src='"+gInfo.playerList[p].photoURL+"'></div>");
    element.css('background',roleColors[gInfo.playerList[p].role]);
    element.css('border',"medium "+((gInfo.currentPlayer==p)?"solid":"none")+" red");
    element.prop('title', gInfo.playerList[p].displayName);
    $("#GAMEBoard .playerPics").append(element);
  }
  myGAMEIndex=[];
  for (var p in gInfo.playerList) {
    if (gInfo.playerList[p].uid==currentUID) myGAMEIndex.push(parseInt(p));
  }
  debug(2,"myGAMEIndex="+myGAMEIndex);
  $("#sjButtons").hide();
  $("#gameButtonJoin").hide();
  $("#gameButtonStart").hide();
  if (myGAMEIndex.length && gInfo.status!="quit")
    $("#GAMEBoard .gameButtonEnd").attr("disabled",false);
  else
    $("#GAMEBoard .gameButtonEnd").attr("disabled",true);
  $("#GAMEBoard .gameTurn").css("color","black");
  $("#GAMEBoard .gameTurn").html("");
  switch(gInfo.status) {
    case "pending":
      var color= (gInfo.playerList[0].role != "White") ? "White" : "Brown";
      $("#gameButtonJoin").val(color); // ### setting a specific role to the button
      $("#gameButtonJoin").html("Join as "+color);
      $("#gameButtonJoin").show();
      $("#sjButtons").show();
      mode="passive";
      printBoard();
      break;
    case "active":
      printBoard();
      if (checkPlayer()) $("#GAMEBoard .gameTurn").css("color","red");
      $("#GAMEBoard .gameTurn").html(gInfo.playerList[gInfo.currentPlayer].role+" player's turn");
      if (mode !="animation") mode="active";
      if (gData.special) {                                             // now need to check special messages or end conditions
        if (gData.special.endGame) {
          if (myGAMEIndex.length) {                                     // Mark player ready to end
            var updates= new Object();                                 // remove my Players from gameInfo
            for (var player in gInfo.playerList)
              if (gInfo.playerList[player].uid==currentUID)
                updates[player+'/uid']=0;
            db.ref("/gameInfo/"+gInfo.gid+"/playerList/").update(updates);
          }
        }
      }

      break;
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
  pixelSize=Math.min(window.innerWidth,(window.innerHeight-60))/1000;
  $("#GAMEBoard .gameContent").css("width",pixelSize*1000);
}

//*************************************************************************************************
// Loop - called 60 times per second
//*************************************************************************************************
void draw() {

// gameMsg is set when a user enters or leaves a specific game
  if (gameMsg == "GAME") {
    debug(2,"New:"+newGID+" Old:"+gameID);
// user left the game. Stop listening to firebase events related to this game
    if (gameID) {
      db.ref("gameData/GAME/"+gameID).off();
      db.ref("gameChat/GAME/"+gameID).off();
    }
// user entered the game (either as player or watcher). Start listening to firebase events related to this game
    gameID=newGID;
    if (gameID) {
// Server updated the game information
      db.ref("gameData/GAME/"+gameID).on("value", GAMEEvent);
// Chat messages related to this game
      db.ref("gameChat/GAME/"+gameID).on("child_added", function(snapshot) {
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

void mouseClicked () {
}

/************************************************************************************************
*
*   Service funtions (called by events)
*
************************************************************************************************/
//*************************************************************************************************
// Check is I'm currently playing.
//*************************************************************************************************
function checkPlayer() {
  return (gInfo.playerList[gInfo.currentPlayer].uid==currentUID);
}



//*************************************************************************************************
//   This function prints out the board based on the board array
//*************************************************************************************************
function printBoard() {
  size(pixelSize*1000,pixelSize*1000);
  scale(pixelSize,pixelSize); 
}
