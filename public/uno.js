/************************************************************************************************
*
*   Define global variables
*
************************************************************************************************/
/* @pjs preload="../pics/UNO_cards_deck.svg.png,../pics/UNO-back.png" */
// -----------------------

var cnst={
};

var SZ=500;
var uno_back=-1; // image back of UNO card
var myunoIndex=0;                                              // 0 - no active player
                                                                      // 1 - White
                                                                      // 2 - Brown
                                                                      // 3 - Both (single player)

// Current uno board

// for each square on the board, boolean indication if there is a legal move for current player starting from it

var pixelSize;                                                        // translate game pixes to real pixels
var mode="passive";                                                   // "passive" - my player is not playing
                                                                      // "active" - player can roll dice or move pieces
                                                                      // "animation" - shows smooth movement of the piece or dice rolling
var uno_colors=[#000000, // no color
                #FF0000, // red
                #FFFF00, // yellow
                #00FF00, // green
                #0000FF];// blue

var uno_cards=[
           {c_type:0, c_color:1, c_value:0, c_image:-1},//red
           {c_type:0, c_color:1, c_value:1, c_image:-1},
           {c_type:0, c_color:1, c_value:2, c_image:-1},
           {c_type:0, c_color:1, c_value:3, c_image:-1},
           {c_type:0, c_color:1, c_value:4, c_image:-1},
           {c_type:0, c_color:1, c_value:5, c_image:-1},
           {c_type:0, c_color:1, c_value:6, c_image:-1},
           {c_type:0, c_color:1, c_value:7, c_image:-1},
           {c_type:0, c_color:1, c_value:8, c_image:-1},
           {c_type:0, c_color:1, c_value:9, c_image:-1},
           {c_type:1, c_color:1, c_value:10,c_image:-1},// skip
           {c_type:2, c_color:1, c_value:11,c_image:-1},// change direction
           {c_type:3, c_color:1, c_value:12,c_image:-1},// +2
           {c_type:0, c_color:2, c_value:0, c_image:-1},//yellow
           {c_type:0, c_color:2, c_value:1, c_image:-1},
           {c_type:0, c_color:2, c_value:2, c_image:-1},
           {c_type:0, c_color:2, c_value:3, c_image:-1},
           {c_type:0, c_color:2, c_value:4, c_image:-1},
           {c_type:0, c_color:2, c_value:5, c_image:-1},
           {c_type:0, c_color:2, c_value:6, c_image:-1},
           {c_type:0, c_color:2, c_value:7, c_image:-1},
           {c_type:0, c_color:2, c_value:8, c_image:-1},
           {c_type:0, c_color:2, c_value:9, c_image:-1},
           {c_type:1, c_color:2, c_value:10,c_image:-1},// skip
           {c_type:2, c_color:2, c_value:11,c_image:-1},// change direction
           {c_type:3, c_color:2, c_value:12,c_image:-1},// +2
           {c_type:0, c_color:3, c_value:0, c_image:-1},//green
           {c_type:0, c_color:3, c_value:1, c_image:-1},
           {c_type:0, c_color:3, c_value:2, c_image:-1},
           {c_type:0, c_color:3, c_value:3, c_image:-1},
           {c_type:0, c_color:3, c_value:4, c_image:-1},
           {c_type:0, c_color:3, c_value:5, c_image:-1},
           {c_type:0, c_color:3, c_value:6, c_image:-1},
           {c_type:0, c_color:3, c_value:7, c_image:-1},
           {c_type:0, c_color:3, c_value:8, c_image:-1},
           {c_type:0, c_color:3, c_value:9, c_image:-1},
           {c_type:1, c_color:3, c_value:10,c_image:-1},// skip
           {c_type:2, c_color:3, c_value:11,c_image:-1},// change direction
           {c_type:3, c_color:3, c_value:12,c_image:-1},// +2
           {c_type:0, c_color:4, c_value:0, c_image:-1},//blue
           {c_type:0, c_color:4, c_value:1, c_image:-1},
           {c_type:0, c_color:4, c_value:2, c_image:-1},
           {c_type:0, c_color:4, c_value:3, c_image:-1},
           {c_type:0, c_color:4, c_value:4, c_image:-1},
           {c_type:0, c_color:4, c_value:5, c_image:-1},
           {c_type:0, c_color:4, c_value:6, c_image:-1},
           {c_type:0, c_color:4, c_value:7, c_image:-1},
           {c_type:0, c_color:4, c_value:8, c_image:-1},
           {c_type:0, c_color:4, c_value:9, c_image:-1},
           {c_type:1, c_color:4, c_value:10,c_image:-1},// skip
           {c_type:2, c_color:4, c_value:11,c_image:-1},// change direction
           {c_type:3, c_color:4, c_value:12,c_image:-1},// +2
           {c_type:4, c_color:0, c_value:13,c_image:-1},// choose color
           {c_type:5, c_color:0, c_value:14,c_image:-1} // choose color +4
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
  pixelSize=Math.min(window.innerWidth,(window.innerHeight-60))/SZ;
  $("#unoBoard .gameContent").css("width",pixelSize*SZ);
  if($("#unoBoard").is(":visible")) printBoard();
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
  do {
    newGID=Math.floor(Math.random() * (1000000000000))+1;
  } while (gameInfo[newGID]); // need to try again just in case the GID is taken
  gInfo={
    game:"uno",
    gid:newGID,
    playerList:[],
    currentPlayer:0,
    status:'pending'
  } ;
  gInfo.playerList.push({
    role:0,
    uid:currentUID,
    displayName:auth.currentUser.displayName,
    photoURL:auth.currentUser.photoURL,
  });
  
  gData={
    nPlayers:1,
    openDeck:[],
    closedDeck:[],
    playerDeck:[[]],
    direction: 1,
    take2: 0,
    take4: 0,
    toggle:0,
  };

  for(var c=0;c<54;c++) // fill the closed pile with all the cards (by order)
    for(var i=0;i<uno_count[c];i++)
      gData.closedDeck.push(c);
  for(var i=0;i<10;i++)
    shuffleCards(gData.closedDeck, 108);
  
  var firstCard;
  do {
    firstCard=gData.closedDeck.pop(); // take the top card off the closed pile
    if (firstCard>52) gData.closedDeck.splice(Math.floor(Math.random()*gData.closedDeck.length),0,firstCard); // can't be change color
  } while (firstCard>52);
  gData.openDeck.push(firstCard);
  if (uno_cards[firstCard].c_value==10) gInfo.currentPlayer=1; // skip first player
  if (uno_cards[firstCard].c_value==11) gData.direction=-1;    // start in reverse direction
  if (uno_cards[firstCard].c_value==12) gData.take2=1;         // first player needs to take2
  
  gData.playerDeck.push([]);
  for (var i=0; i<7; i++) {
    gData.playerDeck[0].push(gData.closedDeck.pop());  
  }
 
  db.ref("gameInfo/"+newGID).set(gInfo);
  db.ref("gameData/"+gInfo.game+"/"+newGID).set(gData);
  gameMsg="uno";
  $("#unoOptionsBoard").hide();
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
  gInfo=gameInfo[gameID];
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
  $("#sjButtons").hide();
  $("#gameButtonJoin").hide();
  $("#gameButtonStart").hide();
  if (myunoIndex && gInfo.status!="quit")
    $("#unoBoard .gameButtonEnd").attr("disabled",false);
  else
    $("#unoBoard .gameButtonEnd").attr("disabled",true);
  switch(gInfo.status) {
    case "pending":
      $("#gameButtonJoin").val(gData.nPlayers);
      $("#gameButtonJoin").html("Join");
      $("#gameButtonJoin").show();
      $("#sjButtons").show();
      if (gData.nPlayers>=2 && gInfo.playerList[0].uid==currentUID)
         $("#gameButtonStart").show();
      mode="passive";
      printBoard();
      break;
    case "active":
      printBoard();
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
  pixelSize=Math.min(window.innerWidth,(window.innerHeight-60))/SZ;
  $("#unoBoard .gameContent").css("width",pixelSize*SZ);
  uno_all_cards=loadImage("../pics/UNO_cards_deck.svg.png");
  uno_back=loadImage("../pics/UNO-back.png");
  var h=360, w=240;
  for (var i=0; i<54; i++)
    uno_cards[i].c_image=createImage(w,h,RGB);
  for (var j=0; j<4; j++)
    for (var i=0; i<13; i++)
      uno_cards[i+j*13].c_image.copy (uno_all_cards, i*w,j*h,w,h,0,0,w,h); 
  uno_cards[52].c_image.copy (uno_all_cards, 13*w,h,w,h,0,0,w,h); // change color
  uno_cards[53].c_image.copy (uno_all_cards, 13*w,4*h,w,h,0,0,w,h); // change color +4
}

//*************************************************************************************************
// Loop - called 60 times per second
//*************************************************************************************************
void draw() {

// gameMsg is set when a user enters or leaves a specific game
  if (gameMsg == "uno") {
    debug(2,"Uno New:"+newGID+" Old:"+gameID);
// user left the game. Stop listening to firebase events related to this game
    if (gameID) {
      db.ref("gameData/uno/"+gameID).off();
      db.ref("gameChat/uno/"+gameID).off();
    }
// user entered the game (either as player or watcher). Start listening to firebase events related to this game
    gameID=newGID;
    if (gameID) {
      currentGame=gameMsg;
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
  var ok=false;
  var x=mouseX/pixelSize, y=mouseY/pixelSize;
  if (checkPlayer()) {
    var ncards=gData.playerDeck[gInfo.currentPlayer].length;
    var cardsize=Math.min(SZ*0.07,SZ/(ncards+1));
    var leftcard=(SZ-(cardsize*(ncards+1)))/2;
    // if clicking on a card, discart it to open pile
    if (x>leftcard && x<(SZ-leftcard) && y>(SZ*0.7) && y<(SZ*0.7+cardsize*3)) {     
      var i=min(Math.floor((x-leftcard)/cardsize),ncards-1);
      // check if I selected a legal card to play
      topCard=gData.openDeck[gData.openDeck.length-1];
      myCard=gData.playerDeck[gInfo.currentPlayer][i];
      if (gData.take2 && uno_cards[myCard].c_value!=12)
        return; // after pervious player played take2, you can only play another take2
      if (uno_cards[myCard].c_value<13 && uno_cards[topCard].c_value!=uno_cards[myCard].c_value && uno_cards[topCard].c_color!=uno_cards[myCard].c_color)
        return; // not changing color, and mismatch in value AND color - can't select this card
      gData.openDeck.push(myCard);
      gData.playerDeck[gInfo.currentPlayer].splice(i,1);
      if (uno_cards[myCard].c_value==10) gInfo.currentPlayer+=gData.direction; // skip next player card
      if (uno_cards[myCard].c_value==11) gData.direction= -gData.direction; // change direction card
      if (uno_cards[myCard].c_value==12) gData.take2++; // next player take two cards
      ok=true;
    }
    
    // if clicking on closed pile, take card from closed pile
    if (x>(SZ*0.5) && x<(SZ*0.64) && y>(SZ*0.3) && y<(SZ*0.51)) {
      takeCards=max(1,gData.take2*2+gData.take4*4);
      for (var i=0; i<takeCards; i++)
        gData.playerDeck[gInfo.currentPlayer].push(gData.closedDeck.pop());  
      gData.take2=gData.take4=0;
      ok=true;
    }
    
  /*   
    gData.toggle=gData.toggle^1; // just touch gData to force update to everyone.
  */  
    if (ok) {
      if (gData.playerDeck[gInfo.currentPlayer].length>0) {
        gInfo.currentPlayer=(gInfo.currentPlayer+gData.direction+gData.nPlayers)% gData.nPlayers;
        db.ref("gameInfo/"+gameID).set(gInfo);
        db.ref("gameData/"+gInfo.game+"/"+gameID).set(gData);
      } else {
        gInfo.status="quit";
        gInfo.overMsg=auth.currentUser.displayName+" had won the game";
        db.ref("gameInfo/"+gameID).set(gInfo);
      }
    }
  }
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
  size(pixelSize*SZ,pixelSize*SZ);
  scale(pixelSize,pixelSize); 
  if (checkPlayer()) fill(#99ff66); else fill (#999966)
  rect(0,0,1000,1000);
  if (gInfo.status=="active") {
    var myIndex=gInfo.currentPlayer; // find which player's card to display
    var i;
    for (i=0;i<gData.nPlayers;i++) {
      if (gInfo.playerList[myIndex].uid==currentUID) break; // this is my player
      myIndex=(myIndex+1)%gData.nPlayers;
    }
    if (i<gData.nPlayers) {  // I'm not just a spectator 
      var ncards=gData.playerDeck[myIndex].length;
      var cardsize=Math.min(SZ*0.07,SZ/(ncards+1));
      var leftcard=(SZ-(cardsize*(ncards+1)))/2;
      for (var i=0;i<ncards;i++) {
        image(uno_cards[gData.playerDeck[myIndex][i]].c_image, leftcard+i*cardsize, SZ*0.7, cardsize*2, cardsize*3);
      }
    }
    image(uno_cards[gData.openDeck[gData.openDeck.length-1]].c_image, SZ*0.3, SZ*0.3, SZ*0.14, SZ*0.21);
    image(uno_back, SZ*0.5, SZ*0.3, SZ*0.14, SZ*0.21);
    fill(0);
    text(gData.openDeck.length,SZ*0.35,SZ*0.28);
    text(gData.closedDeck.length,SZ*0.55,SZ*0.28);
  }
  $("#unoBoard").show();
  $("#unoCanvas").show();
}




