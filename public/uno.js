/************************************************************************************************
*
*   Define global variables
*
************************************************************************************************/
/* @pjs preload="../pics/UNO_cards_deck.png"; */
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
var uno_colors=[#000000, // no color
                #FF0000, // red
                #FFFF00, // yellow
                #00FF00, // green
                #0000FF];// blue

var uno_cards=[
           {c_type:0, c_color:1, c_number:0, c_image:-1},//red
           {c_type:0, c_color:1, c_number:1, c_image:-1},
           {c_type:0, c_color:1, c_number:2, c_image:-1},
           {c_type:0, c_color:1, c_number:3, c_image:-1},
           {c_type:0, c_color:1, c_number:4, c_image:-1},
           {c_type:0, c_color:1, c_number:5, c_image:-1},
           {c_type:0, c_color:1, c_number:6, c_image:-1},
           {c_type:0, c_color:1, c_number:7, c_image:-1},
           {c_type:0, c_color:1, c_number:8, c_image:-1},
           {c_type:0, c_color:1, c_number:9, c_image:-1},
           {c_type:1, c_color:1, c_number:-1,c_image:-1},// skip
           {c_type:2, c_color:1, c_number:-1,c_image:-1},// change direction
           {c_type:3, c_color:1, c_number:-1,c_image:-1},// +2
           {c_type:0, c_color:2, c_number:0, c_image:-1},//yellow
           {c_type:0, c_color:2, c_number:1, c_image:-1},
           {c_type:0, c_color:2, c_number:2, c_image:-1},
           {c_type:0, c_color:2, c_number:3, c_image:-1},
           {c_type:0, c_color:2, c_number:4, c_image:-1},
           {c_type:0, c_color:2, c_number:5, c_image:-1},
           {c_type:0, c_color:2, c_number:6, c_image:-1},
           {c_type:0, c_color:2, c_number:7, c_image:-1},
           {c_type:0, c_color:2, c_number:8, c_image:-1},
           {c_type:0, c_color:2, c_number:9, c_image:-1},
           {c_type:1, c_color:2, c_number:-1,c_image:-1},// skip
           {c_type:2, c_color:2, c_number:-1,c_image:-1},// change direction
           {c_type:3, c_color:2, c_number:-1,c_image:-1},// +2
           {c_type:0, c_color:3, c_number:0, c_image:-1},//green
           {c_type:0, c_color:3, c_number:1, c_image:-1},
           {c_type:0, c_color:3, c_number:2, c_image:-1},
           {c_type:0, c_color:3, c_number:3, c_image:-1},
           {c_type:0, c_color:3, c_number:4, c_image:-1},
           {c_type:0, c_color:3, c_number:5, c_image:-1},
           {c_type:0, c_color:3, c_number:6, c_image:-1},
           {c_type:0, c_color:3, c_number:7, c_image:-1},
           {c_type:0, c_color:3, c_number:8, c_image:-1},
           {c_type:0, c_color:3, c_number:9, c_image:-1},
           {c_type:1, c_color:3, c_number:-1,c_image:-1},// skip
           {c_type:2, c_color:3, c_number:-1,c_image:-1},// change direction
           {c_type:3, c_color:3, c_number:-1,c_image:-1},// +2
           {c_type:0, c_color:4, c_number:0, c_image:-1},//blue
           {c_type:0, c_color:4, c_number:1, c_image:-1},
           {c_type:0, c_color:4, c_number:2, c_image:-1},
           {c_type:0, c_color:4, c_number:3, c_image:-1},
           {c_type:0, c_color:4, c_number:4, c_image:-1},
           {c_type:0, c_color:4, c_number:5, c_image:-1},
           {c_type:0, c_color:4, c_number:6, c_image:-1},
           {c_type:0, c_color:4, c_number:7, c_image:-1},
           {c_type:0, c_color:4, c_number:8, c_image:-1},
           {c_type:0, c_color:4, c_number:9, c_image:-1},
           {c_type:1, c_color:4, c_number:-1,c_image:-1},// skip
           {c_type:2, c_color:4, c_number:-1,c_image:-1},// change direction
           {c_type:3, c_color:4, c_number:-1,c_image:-1},// +2
           {c_type:4, c_color:0, c_number:-1,c_image:-1},// choose color
           {c_type:5, c_color:0, c_number:-1,c_image:-1} // choose color +4
];

var uno_count=[1,2,2,2,2,2,2,2,2,2,2,2,2,
               1,2,2,2,2,2,2,2,2,2,2,2,2,
               1,2,2,2,2,2,2,2,2,2,2,2,2,
               1,2,2,2,2,2,2,2,2,2,2,2,2,
               4,4];

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
		  gInfo.concede=auth.currentUser.displayName;
		  db.ref("gameData/"+gInfo.game+"/"+gameID).set(gData);
		  db.ref("gameInfo/"+gameID).set(gInfo);
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
  gInfo.playerList.push({
    uid:currentUID,
    displayName:auth.currentUser.displayName,
    photoURL:auth.currentUser.photoURL,
  });
  
  gData={
	  nPlayers:1,
	  openDeck:[],
	  closedDeck:[],
	  playerDeck:[[]],
	  info:gInfo,
  };

  for(var c=0;c<54;c++)
    for(var i=0;i<uno_count[c];i++)
      gData.closedDeck.push(c);
  for(var i=0;i<10;i++)
    shuffleCards(gData.closedDeck, 108);
  
  gData.playerDeck.push([]);
  for (var i=0; i<7; i++) {
	gData.playerDeck[0].push(gData.closedDeck.pop());  
  }
 
  db.ref("gameData/"+gInfo.game+"/"+newGID).set(gData);
  db.ref("gameInfo/"+newGID).set(gInfo);
  gameMsg="uno";
  $("#unoOptionsBoard").hide();
});


//*************************************************************************************************
//   User selected to join the game as a player 
//*************************************************************************************************
$("#unoBoard .gameButtonJoin").click(function() {
  if (gInfo.status=="pending") {
    gInfo.playerList.push({
	  uid:currentUID,
      displayName:auth.currentUser.displayName,
      photoURL:auth.currentUser.photoURL});
    gData.playerDeck.push([]);
    for (var i=0; i<7; i++) {
	  gData.playerDeck[gData.nPlayers].push(gData.closedDeck.pop());  
    }
    gData.nPlayers++;
	if (gData.nPlayers==$("#unoMaxPlayers").val()) 
	  gInfo.status="active";
    db.ref("gameData/"+gInfo.game+"/"+gameID).set(gData);
    db.ref("gameInfo/"+gameID).set(gInfo);
  }
  else debug(0,"Game not Pending. Can't start");
});


//*************************************************************************************************
//   User selected to start the game without the maximum players 
//*************************************************************************************************
$("#unoBoard .gameButtonStart").click(function() {
  gInfo.status="active";
  db.ref("gameData/"+gInfo.game+"/"+gameID).set(gData);
  db.ref("gameInfo/"+gameID).set(gInfo);
  
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
    element.css('background','white');
    element.css('border',"medium "+((gInfo.currentPlayer==p)?"solid":"none")+" red");
    element.prop('title', gInfo.playerList[p].displayName+"("+gData.playerDeck[p].length+")");
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
  $("#unoBoard .gameButtonStart").hide();
  if (myunoIndex && gInfo.status!="quit")
    $("#unoBoard .gameButtonEnd").attr("disabled",false);
  else
    $("#unoBoard .gameButtonEnd").attr("disabled",true);
  $("#unoBoard .gameTurn").css("color","black");
  $("#unoBoard .gameTurn").html("");
  switch(gInfo.status) {
    case "pending":
      $("#unoBoard .gameButtonJoin").val(0);
      $("#unoBoard .gameButtonJoin").html("Join");
      $("#unoBoard .gameButtonJoin").show();
	  if (gData.nPlayers>=2 && gInfo.playerList[0].uid==currentUID)
	     $("#unoBoard .gameButtonStart").show();
      mode="passive";
      printBoard();
      break;
    case "active":
      printBoard();
      if (checkPlayer()) $("#unoBoard .gameTurn").css("color","red");
      $("#unoBoard .gameTurn").html(gInfo.playerList[gInfo.currentPlayer].displayName+"'s turn");
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
      swal({
         title: gInfo.concede+" had quit the game",
         text: "  ",
         buttons: false,
         icon: "../pics/swal-quit.jpg",
		 timer: 2000,
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
  uno_all_cards=loadImage("../pics/UNO_cards_deck.png");
  for (var i=0; i<54; i++)
    uno_cards[i].c_image=createImage(73,109,RGB);
  for (var j=0; j<4; j++)
    for (var i=0; i<13; i++)
      uno_cards[i+j*13].c_image.copy (uno_all_cards, i*73,j*109,73,109,0,0,73,109); 
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


void mouseClicked () {
	gInfo.currentPlayer++;
	if (gInfo.currentPlayer >= gData.nPlayers) gInfo.currentPlayer=0;
    db.ref("gameData/"+gInfo.game+"/"+gameID).set(gData);
	db.ref("gameInfo/"+gameID).set(gInfo);
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
  size(sizeSquare*4,sizeSquare*3);
  $("#unoBoard").show();
  $("#unoCanvas").show();
  if (gInfo.status=="active")
    for (var i=0;i<gData.playerDeck[gInfo.currentPlayer].length;i++)
      image(uno_cards[gData.playerDeck[gInfo.currentPlayer][i]].c_image, 500+i*40, 500, 73, 109);

}




