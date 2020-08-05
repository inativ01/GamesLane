/* @pjs preload="island-all-treasures.png,island-helicopter.png,island-sandbags.png"; */
var myIslandIndex= -1;  // player index (0-3) or -1 if not playing
var islandSizeSquare=0,    islandStartX=0, islandStartY=0;
var allowClick=false;
var actionMsg = {action:0,X:0,Y:0,otherPlayer:-1,cardIndex:-1,playerBitmap:-1,special:false};
var imgHelicopter=0; imgSandbags=0;

var playerTypes = [
    {name:"Pilot",color:#0000FF},       // blue
    {name:"Messeger",color:#808080},    // gray
    {name:"Explorer",color:#00FF00},    // green
    {name:"Diver",color:#000000},       // black
    {name:"Navigator",color:#FFFF00},   // yellow
    {name:"Engineer",color:#FF0000}];   // red

var treasures = [
    {name:"The Earth Stone",image:-1},
    {name:"The Statue of the Wind",image:-1},
    {name:"The Crystal of Fire",image:-1},
    {name:"The Ocean's Chalice",image:-1}];

var tiles = [
    {name:"Fools' Landing",                gate:0,  treasure:-1, image1:-1,image2:-1},
    {name:"Silver Gate",                   gate:1,  treasure:-1, image1:-1,image2:-1},
    {name:"Copper Gate",                   gate:2,  treasure:-1, image1:-1,image2:-1},
    {name:"Iron Gate",                     gate:3,  treasure:-1, image1:-1,image2:-1},
    {name:"Gold Gate",                     gate:4,  treasure:-1, image1:-1,image2:-1},
    {name:"Bronze Gate",                   gate:5,  treasure:-1, image1:-1,image2:-1},
    {name:"Temple Of The Moon",            gate:-1, treasure:0,  image1:-1,image2:-1},
    {name:"Temple Of The Sun",             gate:-1, treasure:0,  image1:-1,image2:-1},
    {name:"Whispering Garden",             gate:-1, treasure:1,  image1:-1,image2:-1},
    {name:"Howling Garden",                gate:-1, treasure:1,  image1:-1,image2:-1},
    {name:"Cave of Shadows",               gate:-1, treasure:2,  image1:-1,image2:-1},
    {name:"Cave of Embers",                gate:-1, treasure:2,  image1:-1,image2:-1},
    {name:"Coral Palace",                  gate:-1, treasure:3,  image1:-1,image2:-1},
    {name:"Tidal Palace",                  gate:-1, treasure:3,  image1:-1,image2:-1},
    {name:"Misty Marsh",                   gate:-1, treasure:-1, image1:-1,image2:-1},
    {name:"Observatory",                   gate:-1, treasure:-1, image1:-1,image2:-1},
    {name:"Phantom Rock",                  gate:-1, treasure:-1, image1:-1,image2:-1},
    {name:"Twilight Hollow",               gate:-1, treasure:-1, image1:-1,image2:-1},
    {name:"Dunes of Deseption",            gate:-1, treasure:-1, image1:-1,image2:-1},
    {name:"Watchtower",                    gate:-1, treasure:-1, image1:-1,image2:-1},
    {name:"Breakers Bridge",               gate:-1, treasure:-1, image1:-1,image2:-1},
    {name:"Lost Lagoon",                   gate:-1, treasure:-1, image1:-1,image2:-1},
    {name:"Cliffs of Abandon",             gate:-1, treasure:-1, image1:-1,image2:-1},
    {name:"Crimson Forest",                gate:-1, treasure:-1, image1:-1,image2:-1}];

var treasureCardType = [
    {waterRise:false, sandbags:true,  helicopter:false, treasure:-1, count:2},
    {waterRise:false, sandbags:false, helicopter:true,  treasure:-1, count:3},
    {waterRise:false, sandbags:false, helicopter:false, treasure:0,  count:5},
    {waterRise:false, sandbags:false, helicopter:false, treasure:1,  count:5},
    {waterRise:false, sandbags:false, helicopter:false, treasure:2,  count:5},
    {waterRise:false, sandbags:false, helicopter:false, treasure:3,  count:5},
    {waterRise:true,  sandbags:false, helicopter:false, treasure:-1, count:3}];

var floodLevels = [2,2,3,3,3,4,4,5,5,100];

var islandInfo = {
  gameLevel:0,                // not implemented - Initial value of water Level
  numPlayers:0,               // number of players in the game
  missingPlayers:0,           // players who left the game, and must be replaced.
  players :                   // for each player: name, role (index of playerTypes), location of play piece
    [{name:"",role:-1,x:-1,y:-1},{name:"",role:-1,x:-1,y:-1},{name:"",role:-1,x:-1,y:-1},{name:"",role:-1,x:-1,y:-1}],
  playerCards : [             // up to 5 (temporary 6) treasure cards per player (index of treasureCardType)
    [-1,-1,-1,-1,-1,-1],
    [-1,-1,-1,-1,-1,-1],
    [-1,-1,-1,-1,-1,-1],
    [-1,-1,-1,-1,-1,-1]],
  autoSelect:false,           // not implemented - if TRUE the player roles are selected randomly. If FALSE, selected by the players
  currentPlayer : -1,         // -1 - game not yet started, 0-3 - index of current player, -2 - game over
  currentStage : 0,           //stage=0 - perform 3 actions, stage=1 - draw 2 Treasure cards, stage=2 - draw flood cards based on the water level
  currentSubStage: 0,         // count repetitions within each stage
  waterLevel : 0,             // Meter of the water level 0-9. Index of floodLevels
  floodCards:                 // deck of flood cards (index of  tiles)
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  floodTop: 0,                // the index of the top flood card in the pile. All indexes below it are in the flood discard pile
  floodSize: 24,              // total number of cards in the flood pile plus flood discard pile
  treasureCards:              // deck of treasure cards (index of treasureCardType)
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  treasureSize: 28,           // number of cards in the treasure deck
  treasureDiscards:           // discard pile for treasure cards
    [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],
  discardSize: 0,             // number of cards in the treasure discard deck
  collected: [0,0,0,0],       // boolean array (T/F) of collected treasures (index corresponds to index of 'treasures'
  board : [                   // 6x6 tiles of the board (index of  tiles)
    [-2,-2,-1,-1,-2,-2],
    [-2,-1,-1,-1,-1,-2],
    [-1,-1,-1,-1,-1,-1],
    [-1,-1,-1,-1,-1,-1],
    [-2,-1,-1,-1,-1,-2],
    [-2,-2,-1,-1,-2,-2]],
  freeMovePlayer: -1          // value >=0 indicates an additional move of a player on the same action (value is player index)
};

var islandCheck = {           // possible actions
  move : [                    // for each spot on the board, can we move there?
    [0,0,0,0,0,0],
    [0,0,0,0,0,0],
    [0,0,0,0,0,0],
    [0,0,0,0,0,0],
    [0,0,0,0,0,0],
    [0,0,0,0,0,0]],
  moveOK: true,               // true IFF move is possible to ANY tile on the boards
  shoreUp: [                  // for each spot on the board, can we shore-up there?
    [0,0,0,0,0,0],
    [0,0,0,0,0,0],
    [0,0,0,0,0,0],
    [0,0,0,0,0,0],
    [0,0,0,0,0,0],
    [0,0,0,0,0,0]],
  shoreUpOK: true,            // true IFF move is possible to ANY tile on the boards
  transferMask: [0,0,0,0],    // boolean - can we transfer treasure card to any of the (other) players (always FALSE to self)
  transferCount: 0,           // how many players can we transfer treasure cards to?
  getTreasure: -1,            // -1 - we're not ready to obtain a treasure. 0-3 - index of treasure that we can obtain.
};


/*---------------------------------------------------------------------------------------------------------------------
Click button to start or stop Forbidden Island
---------------------------------------------------------------------------------------------------------------------*/
$('#islandButton').click(function() {
    if (activeGame==0) {
      $("#islandBoard").show();
      this.innerHTML="Stop Forbidden Island";
      $("#chessButton").prop("disabled",true);
      sock.emit('joinIsland',-1);                                     // fake join - just to get the setup info
      activeGame=2;
    }
    else if (activeGame==2)
    {
      if (myIslandIndex >= 0) sock.emit('joinIsland',-2);             // fake join - un-join
      $("#islandBoard").hide();
      this.innerHTML="Play Forbidden Island";
      $("#chessButton").prop("disabled",false);
      myIslandIndex=-1;
      activeGame=0;
    }
});


/*---------------------------------------------------------------------------------------------------------------------
Print a single tile of the island
---------------------------------------------------------------------------------------------------------------------*/
function islandPrintSquare(x,y) {
  var flooded=#4CAF50; // green  #009900
  var card=islandInfo.board[x][y];
  if (card >= 100) {
    flooded=#008CBA; // light blue;  #0099ff
    card -= 100;
  }
  if(islandInfo.board[x][y] >= 0) {
    fill(flooded);
    rect(islandStartX+islandSizeSquare*x,islandStartY+islandSizeSquare*y,islandSizeSquare,islandSizeSquare,10);
    if (tiles[card].treasure>=0)                                      // if this is a treasure tile
      image(treasures[tiles[card].treasure].image,islandStartX+islandSizeSquare*(x+0.1),islandStartY+islandSizeSquare*(y+0.6),islandSizeSquare/3,islandSizeSquare/3);
    if (card==0)
      image(imgHelicopter,islandStartX+islandSizeSquare*(x+0.1),islandStartY+islandSizeSquare*(y+0.5),islandSizeSquare/2,islandSizeSquare/2);
    fill(#000000);
    textSize(10);
    text(tiles[card].name,islandStartX+islandSizeSquare*x+5,islandStartY+islandSizeSquare*y+10,islandSizeSquare-10,islandSizeSquare);
  }
}

/*---------------------------------------------------------------------------------------------------------------------
Print the entire Treasure Island board
* Draw treasure cards for all players
* Draw all tiles for the island
* Draw the player location on the board
* Draw the collected treasures
* Draw the 4 card piles
---------------------------------------------------------------------------------------------------------------------*/
function islandPrintBoard() {
  islandSizeSquare=Math.floor(min(window.innerWidth,window.innerHeight)*.08);
  islandStartX=islandSizeSquare; islandStartY=islandSizeSquare*3;
  size(islandSizeSquare*10,islandSizeSquare*10);
  background(#0000ff);
  // Treasure cards for each player
  for (var i=0; i<islandInfo.numPlayers; i++) {
    if (i==myIslandIndex) {
      stroke(#ff0000);
      strokeWeight(2);
    }
    else {
      stroke(#000000);
      strokeWeight(1);
    }
    fill (200);
    rect(islandSizeSquare*5.1,islandSizeSquare*(i+0.1),islandSizeSquare*4.8,islandSizeSquare*0.85);
    fill(playerTypes[islandInfo.players[i].role].color);
    textSize(12);
    text(playerTypes[islandInfo.players[i].role].name,islandSizeSquare*5.15,islandSizeSquare*(i+0.5));
    fill (#888800);
    if (i==myIslandIndex) stroke(#ffff00);
    for (var j=0;j<6;j++) {  // print cards
      var card=islandInfo.playerCards[i][j];
      if (card >= 0) {
        var img;
        rect(islandSizeSquare*(6.1+j*0.65),islandSizeSquare*(i+0.15),islandSizeSquare*0.55,islandSizeSquare*0.75,5);
        if (treasureCardType[card].treasure >=0) img=treasures[treasureCardType[card].treasure].image;
        else if (treasureCardType[card].helicopter) img=imgHelicopter;
        else if (treasureCardType[card].sandbags) img=imgSandbags;
        image(img,islandSizeSquare*(6.15+j*0.65),islandSizeSquare*(i+0.35),islandSizeSquare*0.5,islandSizeSquare*0.5);
      }
    }
  }
  stroke(0);
  strokeWeight(1);

  // Board tiles
  if (islandInfo.currentPlayer == -1) return;
  for(var i=0; i<6; i++) {
    for(var j=0; j<6; j++) {
      islandPrintSquare(i,j);
    }
  }

  // Display player pieces
  for (var p=0; p<islandInfo.numPlayers; p++) {
    fill(playerTypes[islandInfo.players[p].role].color);
    ellipse(islandStartX+islandSizeSquare*(islandInfo.players[p].x+0.5+(p*0.1)),islandStartY+islandSizeSquare*(islandInfo.players[p].y+0.7),islandSizeSquare/4,islandSizeSquare/4);
  }

  // Collected treasures
  for (var i=0;i<4;i++)
    if (islandInfo.collected[i])
     image(treasures[i].image, islandSizeSquare*((i&1)+7.5), islandSizeSquare*(5+(i&2)/2) ,islandSizeSquare,islandSizeSquare);

  // Card decks - treasure and flood cards
  fill(#000088);
  rect(islandSizeSquare*0.2,islandSizeSquare*0.5, islandSizeSquare,islandSizeSquare*1.5,10);
  rect(islandSizeSquare*1.4,islandSizeSquare*0.5, islandSizeSquare,islandSizeSquare*1.5,10);
  fill(#888800);
  rect(islandSizeSquare*2.6,islandSizeSquare*0.5, islandSizeSquare,islandSizeSquare*1.5,10);
  rect(islandSizeSquare*3.8,islandSizeSquare*0.5, islandSizeSquare,islandSizeSquare*1.5,10);
  fill(255);
  textSize(12);
  text("Flood Discard",   islandSizeSquare*0.3,islandSizeSquare*0.6, islandSizeSquare*0.8,islandSizeSquare*1.5);
  text("Flood Pile",      islandSizeSquare*1.5,islandSizeSquare*0.6, islandSizeSquare*0.8,islandSizeSquare*1.5);
  text("Treasure Pile",   islandSizeSquare*2.7,islandSizeSquare*0.6, islandSizeSquare*0.8,islandSizeSquare*1.5);
  text("Treasure Discard",islandSizeSquare*3.9,islandSizeSquare*0.6, islandSizeSquare*0.8,islandSizeSquare*1.5);
  textSize(16);
  text(islandInfo.floodTop,                     islandSizeSquare*0.6,islandSizeSquare*1.6);
  text(islandInfo.floodSize-islandInfo.floodTop,islandSizeSquare*1.8,islandSizeSquare*1.6);
  text(islandInfo.treasureSize,                 islandSizeSquare*3.0,islandSizeSquare*1.6);
  text(islandInfo.discardSize,                  islandSizeSquare*4.2,islandSizeSquare*1.6);

  // Water level bar
  fill(255);
  noStroke();
  rect (islandSizeSquare*0.5,islandSizeSquare*2.3,islandSizeSquare*4, islandSizeSquare*0.2,10);
  fill(#00FFFF)
  rect (islandSizeSquare*0.5,islandSizeSquare*2.35,islandSizeSquare*0.4*(islandInfo.waterLevel+1), islandSizeSquare*0.1,10);
  strokeWeight(4);
  stroke(#00FF00);
  line (islandSizeSquare*0.6,islandSizeSquare*2.6,islandSizeSquare*1.3, islandSizeSquare*2.6);
  stroke(#FFFF00);
  line (islandSizeSquare*1.3,islandSizeSquare*2.6,islandSizeSquare*2.5, islandSizeSquare*2.6);
  stroke(#FF8000);
  line (islandSizeSquare*2.5,islandSizeSquare*2.6,islandSizeSquare*3.3, islandSizeSquare*2.6);
  stroke(#FF0000);
  line (islandSizeSquare*3.3,islandSizeSquare*2.6,islandSizeSquare*4.1, islandSizeSquare*2.6);
  stroke(#000000);
  line (islandSizeSquare*4.1,islandSizeSquare*2.6,islandSizeSquare*4.4, islandSizeSquare*2.6);
  strokeWeight(1);
  for (var i=0; i<9; i++) line(islandSizeSquare*(0.88+i*0.4), islandSizeSquare*2.2,islandSizeSquare*(0.88+i*0.4), islandSizeSquare*2.7);
  textSize(12);
  fill(#ffffff);
  text(floodLevels[islandInfo.waterLevel],islandSizeSquare*0.3,islandSizeSquare*2.45);

}

/*---------------------------------------------------------------------------------------------------------------------
Send an Action message to the server
---------------------------------------------------------------------------------------------------------------------*/
function sendAction() {
  console.log("Sent action "+actionMsg.action+((actionMsg.special)?"S":""),actionMsg);
  sock.emit('islandAction',actionMsg);
  actionMsg.special=false;
}

/*---------------------------------------------------------------------------------------------------------------------
Find the possible locations that a player can move to
---------------------------------------------------------------------------------------------------------------------*/
function islandCheckMove(player,playerRole) {
  var playerX=islandInfo.players[player].x;
  var playerY=islandInfo.players[player].y;
  islandCheck.moveOK=false;
  for (var i=0; i<6; i++) {
    for (var j=0; j<6; j++) {
      if ((islandInfo.board[i][j]>=0 ||                                                   // don't step on a sunk tile
           islandInfo.board[i][j]>=-1 && playerRole==3) &&                               // ...unless you are a diver
          ((playerRole==0) ||                                                             // Pilot can go anywhere
           (playerX==i && Math.abs(playerY-j)==1) ||                                      // One horizontal step
           (playerY==j && Math.abs(playerX-i)==1) ||                                      // One vertical step
           (playerRole==2 && Math.abs(playerX-i)==1 && Math.abs(playerY-j)==1))) {        // One diagonal move for explorer
        islandCheck.move[i][j]=true;
        islandCheck.moveOK=true;
      }
      else islandCheck.move[i][j]=false;
    }
  }
}

/*---------------------------------------------------------------------------------------------------------------------
Find the possible locations that a player can Shore Up
---------------------------------------------------------------------------------------------------------------------*/
function islandCheckShoreUp(player,playerRole) {
  var playerX=islandInfo.players[player].x;
  var playerY=islandInfo.players[player].y;
  islandCheck.shoreUpOK=false;
  for (var i=0;i<6;i++)
    for (var j=0;j<6;j++) {
      if (islandInfo.board[i][j]>=100 &&                                                  // There is a flooded tile there
          ((playerX==i && Math.abs(playerY-j)<=1) ||                                      // One horizontal step
           (playerY==j && Math.abs(playerX-i)==1) ||                                      // One vertical step
           (playerRole==2 && Math.abs(playerX-i)==1 && Math.abs(playerY-j)==1))) {        // One diagonal move for explorer
        islandCheck.shoreUp[i][j]=true;
        islandCheck.shoreUpOK=true;
      }
      else islandCheck.shoreUp[i][j]=false;
  }
}

/*---------------------------------------------------------------------------------------------------------------------
Hide all invalid actions from the menu
---------------------------------------------------------------------------------------------------------------------*/
function hideInvalidActions() {

  var playerRole=islandInfo.players[myIslandIndex].role;

  islandCheckMove(myIslandIndex,playerRole);                                              // Mark all the spots that the player can move to
  if (islandCheck.moveOK)                                                                 // Can the player move anywhere?
     $("#islandActionButtons div:nth-child(2)").show();
  else
     $("#islandActionButtons div:nth-child(2)").hide();
//------------------------------------------------
  if (playerRole == 4)                                                                    // only Navigator can move other players
     $("#islandActionButtons div:nth-child(3)").show();
  else
     $("#islandActionButtons div:nth-child(3)").hide();
//------------------------------------------------
  islandCheckShoreUp(myIslandIndex,playerRole);                                           // Mark all the spots that the player can shore up
  if (islandCheck.shoreUpOK)                                                              // Can the player shore-up anything?
     $("#islandActionButtons div:nth-child(4)").show();
  else
     $("#islandActionButtons div:nth-child(4)").hide();
  console.log("islandCheck:",islandCheck);
//------------------------------------------------
  islandCheck.transferCount=0;
  for (var i=0; i<islandInfo.numPlayers; i++) {
    if (i!=islandInfo.currentPlayer &&                                                    // can't transfer to self
        (playerRole==1 ||                                                                 // either i'm the messanger...
         (islandInfo.players[i].x==islandInfo.players[myIslandIndex].x &&                 // ... or I'm standing at the same spot as the receipient
          islandInfo.players[i].y==islandInfo.players[myIslandIndex].y))) {
      islandCheck.transferMask[i]=true;
      islandCheck.transferCount++;
    }
    else islandCheck.transferMask[i]=false;
  }
  if (islandCheck.transferCount>0)                                                        // Can the player transfer treasure cards to another player?
     $("#islandActionButtons div:nth-child(5)").show();
  else
     $("#islandActionButtons div:nth-child(5)").hide();
//------------------------------------------------
  islandCheck.getTreasure=-1;
  var count=[0,0,0,0];
  for (var i=0; i<6; i++) {
    var card=islandInfo.playerCards[myIslandIndex][i];
    if (card>1 && card<6) count[treasureCardType[card].treasure]++;
  }
  for (var i=0; i<4; i++) {
    if (count[i]>=4 &&                                                                    // 4 x same treasure card, stand on correct tile
        tiles[islandInfo.board[islandInfo.players[myIslandIndex].x][islandInfo.players[myIslandIndex].y]%100].treasure==i)
      islandCheck.getTreasure=i;
  }
  if (islandCheck.getTreasure>=0)                                                         // Can the player capture treasure?
     $("#islandActionButtons div:nth-child(6)").show();
  else
     $("#islandActionButtons div:nth-child(6)").hide();
}

/*---------------------------------------------------------------------------------------------------------------------
// When JOIN is pressed, send the server a joinIsland request
---------------------------------------------------------------------------------------------------------------------*/
document.getElementById('playerForm').addEventListener('submit', function(e) {
    var playerRole=document.getElementById('playerRole').value;
    if (playerRole >= 0) sock.emit('joinIsland',playerRole);
    e.preventDefault();
});

/*---------------------------------------------------------------------------------------------------------------------
// when START button is pressed, send start message to server
---------------------------------------------------------------------------------------------------------------------*/
document.getElementById('islandStart').onclick=function() {
    console.log("send startIsland");
    sock.emit('startIsland',0);
};

/*---------------------------------------------------------------------------------------------------------------------
Print message and highlight all the cards that can be transferred to another player
---------------------------------------------------------------------------------------------------------------------*/
function islandSelectTransferCard() {
  $(islandMessage).text("Select a treasure card that you want to transfer to the "+playerTypes[islandInfo.players[actionMsg.otherPlayer].role].name);
  noFill();
  for (var i=0; i<5; i++) {                                           // Only enable treasure cards to be transferred (not helicopter or sandbag)
    if (islandInfo.playerCards[myIslandIndex][i]>-1) {
      if(treasureCardType[islandInfo.playerCards[myIslandIndex][i]].treasure == -1) {
        stroke(#000000);
        strokeWeight(1);
      }
      else {
        stroke(#00ff00);
        strokeWeight(2);
      }
      rect(islandSizeSquare*(6.1+i*0.65),islandSizeSquare*(myIslandIndex+0.15),islandSizeSquare*0.55,islandSizeSquare*0.75,5);
    }
  }
}

/*---------------------------------------------------------------------------------------------------------------------
User pressed one of the action buttons
---------------------------------------------------------------------------------------------------------------------*/

$("#islandActionButtons button").click(function() {
  actionMsg.action=Number(this.value);
  switch (actionMsg.action) {
    case 0:                                                           // Action 0: Skip
      sendAction();
      break;

    case 1:                                                           // Action 1: Move Player
      $(islandMessage).text("Click a tile to move to (only use highlighted tiles)");
      allowClick=true;                                                // wait for user to click the target square
      noFill();
      stroke(#00ff00);
      strokeWeight(2);
      for (var i=0;i<6;i++)
        for (var j=0;j<6;j++)
          if (islandCheck.move[i][j])
            rect(islandStartX+islandSizeSquare*i,islandStartY+islandSizeSquare*j,islandSizeSquare,islandSizeSquare,10);
      break;

    case 2:                                                           // Action 2: Move another player
      if (islandInfo.numPlayers==2) {                                 // only two players, move the other player
        actionMsg.otherPlayer=1-myIslandIndex;
        playerRole=islandInfo.players[actionMsg.otherPlayer].role;
        if (playerRole==0) playerRole=1;
        islandCheckMove(actionMsg.otherPlayer,playerRole);
        if (islandCheck.moveOK) {
          allowClick=true;                                           // wait for user to click the square to move
          noFill();
          stroke(#00ff00);
          strokeWeight(2);
          for (var i=0;i<6;i++)
            for (var j=0;j<6;j++)
              if (islandCheck.move[i][j])
                rect(islandStartX+islandSizeSquare*i,islandStartY+islandSizeSquare*j,islandSizeSquare,islandSizeSquare,10);
        }
      }
      else {                                                          // need to select a player to move
        actionMsg.otherPlayer=-1;
        $(islandMessage).text("Select a player you want to move");
        noFill();
        stroke(#00ff00);
        strokeWeight(3);
        for (var i=0; i<islandInfo.numPlayers; i++)
          if (i!=myIslandIndex)
            rect(islandSizeSquare*5.1,islandSizeSquare*(i+0.1),islandSizeSquare*4.8,islandSizeSquare*0.85);
      }
      break;

    case 3:                                                           // Action 3: Shore-up
      $(islandMessage).text("Click a Flooded tile to shore-up");
      allowClick=true;                                                // wait for user to click the square to shore-up
      noFill();
      stroke(#00ff00);
      strokeWeight(2);
      for (var i=0;i<6;i++)
        for (var j=0;j<6;j++)
          if (islandCheck.shoreUp[i][j])
            rect(islandStartX+islandSizeSquare*i,islandStartY+islandSizeSquare*j,islandSizeSquare,islandSizeSquare,10);
      break;

    case 4:                                                           // Action 4: Give treasure card
      if (islandCheck.transferCount==1) {                             // If there is only one receipient - do directly to select cards
        for (var i=0; i<islandInfo.numPlayers; i++)
          if (islandCheck.transferMask[i])
            actionMsg.otherPlayer=i;
        islandSelectTransferCard();
      }
      else {
        actionMsg.otherPlayer=-1;
        $(islandMessage).text("Select a player you want to transfer a treasure card TO");
        noFill();
        stroke(#00ff00);
        strokeWeight(3);
        for (var i=0; i<islandInfo.numPlayers; i++)
          if (islandCheck.transferMask[i])
            rect(islandSizeSquare*5.1,islandSizeSquare*(i+0.1),islandSizeSquare*4.8,islandSizeSquare*0.85);
      }
      break;

    case 5:                                                           // Action 5: Get treasure
      actionMsg.cardIndex=islandCheck.getTreasure;
      sendAction();
      break;

    default:
    $(islandMessage).text("ERROR: incorrect action");
  }
  console.log("Prepared ActionMsg:",actionMsg);
  $("#islandActionButtons").slideUp();
});

/*---------------------------------------------------------------------------------------------------------------------
Selected helicopter passangers
---------------------------------------------------------------------------------------------------------------------*/

$("#helicopterRide button").click(function() {
  var hButton=Number(this.value);
  switch (hButton) {
    case 0:
    case 1:
    case 2:
    case 3:
      var bit = 1<<hButton;
      if (actionMsg.playerBitmap & bit) {                              // Player was already selected. Need to de-select
        $("#helicopterRide button:nth-of-type("+(hButton+1)+")").css('color',("#"+('00000' +
          (playerTypes[islandInfo.players[hButton].role].color & 0xFFFFFF).toString(16)).substr(-6)));
        $("#helicopterRide button:nth-of-type("+(hButton+1)+")").css('background',"#FFFFFF");
      }
      else {                                                           // Player wasn's selected. Need to select it
        $("#helicopterRide button:nth-of-type("+(hButton+1)+")").css('color',"#FFFFFF");
        $("#helicopterRide button:nth-of-type("+(hButton+1)+")").css('background',("#"+('00000' +
          (playerTypes[islandInfo.players[hButton].role].color & 0xFFFFFF).toString(16)).substr(-6)));
      }
      actionMsg.playerBitmap ^= bit;                                   // Perform XOR operation
      if (actionMsg.playerBitmap == 0) {
        $("#helicopterRide button:nth-of-type("+5+")").prop("disabled",true);
        $("#helicopterRide p").show();
      }
      else {
        $("#helicopterRide button:nth-of-type("+5+")").prop("disabled",false);
        $("#helicopterRide p").hide();
      }
      break;
    case 10:
      $(islandMessage).text("Select the tile to air-lift players TO");
      noFill();
      stroke(#00ff00);                                        // mark all possible destination in green
      strokeWeight(2);
      for (var i=0;i<6;i++)
        for (var j=0;j<6;j++)
          if (islandInfo.board[i][j]>=0)
            rect(islandStartX+islandSizeSquare*i,islandStartY+islandSizeSquare*j,islandSizeSquare,islandSizeSquare,10);
      var pl;
      if (actionMsg.playerBitmap&1) pl=0;
      else if (actionMsg.playerBitmap&2) pl=1;
      else if (actionMsg.playerBitmap&4) pl=2;
      else pl=3;
      stroke(#ff0000);                                        // mark source in red
      rect(islandStartX+islandSizeSquare*islandInfo.players[pl].x,islandStartY+islandSizeSquare*islandInfo.players[pl].y,
        islandSizeSquare,islandSizeSquare,10);
      $("#helicopterRide").slideUp();
      break;
    case 11:
      $("#helicopterRide").slideUp();
      actionMsg.action=-1;                                    // cancel - do nothing
      sendAction();
      allowClick=false;
  }
});

/*---------------------------------------------------------------------------------------------------------------------
The current player had joined the game. Index is your player number (saved in myIslandIndex)
---------------------------------------------------------------------------------------------------------------------*/
sock.on('joinIsland', function(index) {
  if (activeGame != 2) return;  // this player is not playing Forbidden Island
  console.log("joinIsland. Index="+index);
  myIslandIndex=index;
//  $("#playerForm").hide();
});

/*---------------------------------------------------------------------------------------------------------------------
Received a message from the server
---------------------------------------------------------------------------------------------------------------------*/
sock.on('islandMsg', function(info) {
  console.log("islandMsg",info);
  switch (info.code) {
    case 1:
      sweetAlert({   title: "Pulled Water Rise card",
                     imageUrl: "flood.jpg",
                     imageSize: "400x150",
                  });
      break;

    case 9:
      sweetAlert({
                     title: "",
                     text: info.msg,
                     showConfirmButton: true,
                     imageUrl: "game_over.png",
                     imageSize: "400x150",
                  });
      break;


    case 10:
      sweetAlert({
                     title: "Mission Accomplised",
                     text: info.msg,
                     imageUrl: "island-helicopter.png",
                     imageSize: "400x150",
                  });
      break;

  }
});

/*---------------------------------------------------------------------------------------------------------------------
This broadcast message received by all player gives the updated status of the game
---------------------------------------------------------------------------------------------------------------------*/
sock.on('setupIsland', function(setup) {
  var i,j;
  actionMsg.action=-1;
  if (activeGame != 2) return;  // this player is not playing Forbidden Island
  console.log("setupIsland");
  islandInfo = jQuery.extend(true, {}, setup);                        // copy the setup in the message
  islandPrintBoard();
  console.log("islandInfo",islandInfo);
  roles=document.getElementById('playerRole').getElementsByTagName('option');
  $("#playerForm").hide();
  $('#islandStart').hide();
  $("#islandActionButtons").hide();
  $("#helicopterRide").hide();

  if (islandInfo.currentPlayer == -2) {                               // game over - just display the board and do nothing
    $(islandMessage).text("Game Over");
    return;
  }
  if (myIslandIndex == -1) {                                          // if not currently an active player
     if (islandInfo.missingPlayers >0) {                              // if some players are missing you can join as a missing player
       $(islandMessage).text("Play instead of a missing player");
       for (i=0;i<7;i++) roles[i].disabled=true;                      // start with ALL disabled roles
       for (i=0;i<islandInfo.numPlayers;i++)                          // ... and enable only the roles of the missing players
         if (islandInfo.players[i].name=="")
         {
           roles[parseInt(islandInfo.players[i].role)+1].disabled=false;
         }
       $("#playerForm").show();
     }
     else if (islandInfo.currentPlayer == -1) {
       $(islandMessage).text("Join the game");
       for (i=0;i<7;i++) roles[i].disabled=false;                     // start with NO disabled roles
       for (i=0;i<islandInfo.numPlayers;i++)                          // ... and disable the rolse that are already taken
         roles[parseInt(islandInfo.players[i].role)+1].disabled=true;
       $("#playerForm").show();
     }
     else
       $(islandMessage).text("Watching - "+playerTypes[islandInfo.players[islandInfo.currentPlayer].role].name+" playing");
  }
  else {                                                              // I am an active player
    if (islandInfo.missingPlayers >0)
      $(islandMessage).text("Wait for missing player(s)");
    else if (islandInfo.currentPlayer == -1)
    {
      if (myIslandIndex == 0 && islandInfo.numPlayers>1) {            // If I'm the game host and there are 2+ players then allow to start the game
        $('#islandStart').show();
        $(islandMessage).text("You can start the game now, or wait for more players");
      }
      else {
        $(islandMessage).text("Wait for the game to start");
      }
    }
    else {                                                            // The game has started
      var sixCards=-1;
      var sunkLanding=-1;
      for (var i=0; i<islandInfo.numPlayers; i++) {                   // check if ANY player is either standing on sunk tile or has 6th treasure card
        var j=(myIslandIndex+i)%islandInfo.numPlayers;                // always start searching from current player
                                                                      // Check if a player is on sunk tile BUT ignore case where explorer moved him.
        if (islandInfo.board[islandInfo.players[j].x][islandInfo.players[j].y]==-1 && islandInfo.freeMovePlayer==-1) {
          sunkLanding=j;
          break;
        }
        if (islandInfo.playerCards[j][5]>-1) {
          sixCards=j;
          break;
        }
      }
      if (sunkLanding>=0) {                                           // some player is standing on sunk tile. He must move.
        if (sunkLanding==myIslandIndex) {
          actionMsg.action=1;                                         // you must move to other tile now
          actionMsg.special=true;                                     // this is special case, don't count as action
          allowClick=true;                                            // wait for user to click the target square
          $(islandMessage).text("You are standing on a sunk tile. Select a tile to move to.");
                                                                      // Mark all the spots that the player can move to
          islandCheckMove(myIslandIndex,islandInfo.players[myIslandIndex].role);
          if (!islandCheck.moveOK) {
            actionMsg.action=99;                                      // Action 99: game over - drowned player
            sendAction();
          }
          noFill();
          stroke(#00ff00);
          strokeWeight(2);
          for (var i=0;i<6;i++)
            for (var j=0;j<6;j++)
              if (islandCheck.move[i][j])
                rect(islandStartX+islandSizeSquare*i,islandStartY+islandSizeSquare*j,islandSizeSquare,islandSizeSquare,10);
        }
        else
          $(islandMessage).text("Wait for the "+playerTypes[islandInfo.players[sunkLanding].role].name+" to move onto solid ground");
      }
      else if (sixCards>=0) {                                         // some player has 6 cards. He must discard
        if (sixCards==myIslandIndex)
          $(islandMessage).text("You must discard the 6th treasure card !");
        else
          $(islandMessage).text("Wait for the "+playerTypes[islandInfo.players[sixCards].role].name+" to discard a treasure card");
      }
      else if (islandInfo.currentPlayer == myIslandIndex) {           // I'm the active player
        if (islandInfo.freeMovePlayer>=0) {                           // if I'm getting a free move (on the same action)
          var playerRole=islandInfo.players[islandInfo.freeMovePlayer].role;
          var myRole    =islandInfo.players[myIslandIndex].role;
          if (myRole==3) {
              islandCheckMove(islandInfo.freeMovePlayer,playerRole);  // Mark all the spots that the player can move to
              if (islandCheck.moveOK) {
                actionMsg.action=1;                                   // you can move to other tile now
                actionMsg.special=true;                               // this is special case, don't count as action
                allowClick=true;                                      // wait for user to click the target square
                $(islandMessage).text("You can continue moving on the same action");
                noFill();
                stroke(#00ff00);
                strokeWeight(2);
                for (var i=0;i<6;i++)
                  for (var j=0;j<6;j++)
                    if (islandCheck.move[i][j])
                      rect(islandStartX+islandSizeSquare*i,islandStartY+islandSizeSquare*j,islandSizeSquare,islandSizeSquare,10);
                return;
              }
          }
          else if (myRole==4) {
            if (playerRole!=2) playerRole=1;                          // no special abilities except for explorer
            islandCheckMove(islandInfo.freeMovePlayer,playerRole);
            if (islandCheck.moveOK) {
              actionMsg.action=2;                                     // you can shore-up another tile now
              actionMsg.special=true;                                 // this is special case, don't count as action
              actionMsg.otherPlayer=islandInfo.freeMovePlayer;
              allowClick=true;                                        // wait for user to click the target square
              $(islandMessage).text("You can do another move on the same action");
              noFill();
              stroke(#00ff00);
              strokeWeight(2);
              for (var i=0;i<6;i++)
                for (var j=0;j<6;j++)
                  if (islandCheck.move[i][j])
                    rect(islandStartX+islandSizeSquare*i,islandStartY+islandSizeSquare*j,islandSizeSquare,islandSizeSquare,10);
              return;
            }
          }
          else if (myRole==5) {
              islandCheckShoreUp(islandInfo.freeMovePlayer,playerRole);// Mark all the spots that the player can move to
              if (islandCheck.shoreUpOK) {
                actionMsg.action=3;                                   // you can shore-up another tile now
                actionMsg.special=true;                               // this is special case, don't count as action
                allowClick=true;                                      // wait for user to click the target square
                $(islandMessage).text("You can do another shore-up on the same action");
                noFill();
                stroke(#00ff00);
                strokeWeight(2);
                for (var i=0;i<6;i++)
                  for (var j=0;j<6;j++)
                    if (islandCheck.shoreUp[i][j])
                      rect(islandStartX+islandSizeSquare*i,islandStartY+islandSizeSquare*j,islandSizeSquare,islandSizeSquare,10);
                return;
              }
          }
        }
        switch (islandInfo.currentStage) {
          case 0:                                                     // stage=0 - perform 3 actions
            $(islandMessage).text("Select an action ("+(islandInfo.currentSubStage+1)+" of 3)");
            hideInvalidActions();
            $("#islandActionButtons").slideDown();
            break;
          case 1:                                                     // stage=1 - draw 2 Treasure cards
            $(islandMessage).text("Click to draw a Treasure Card ("+(islandInfo.currentSubStage+1)+" of 2)");
            noFill();
            stroke(#00FF00);
            strokeWeight(3);
            rect(islandSizeSquare*2.6,islandSizeSquare*0.5, islandSizeSquare,islandSizeSquare*1.5,10);
            strokeWeight(1);
            actionMsg.action=6;
            break;
          case 2:                                                     // stage=2 - draw flood cards based on the water level
            $(islandMessage).text("Click to draw a Flood Card ("+(islandInfo.currentSubStage+1)+" of "+floodLevels[islandInfo.waterLevel]+")");
            noFill();
            stroke(#00FF00);
            strokeWeight(3);
            rect(islandSizeSquare*1.4,islandSizeSquare*0.5, islandSizeSquare,islandSizeSquare*1.5,10);
            strokeWeight(1);
            actionMsg.action=7;
            break;
        }
      }
      else
        $(islandMessage).text("Wait for your turn ("+playerTypes[islandInfo.players[islandInfo.currentPlayer].role].name+" playing)");
    }
  }

});

//*************************************************************************************************
// Initialization
//*************************************************************************************************
void setup() {
  background(255);
  var img=loadImage("island-all-treasures.png");                         // fill up array of treasures
  for (var i=0; i<4; i++) {
    treasures[i].image=createImage(200,200,RGB);
    treasures[i].image.copy (img, i*200,0,200,200,0,0,200,200);
  }
  imgHelicopter=loadImage("island-helicopter.png");
  imgSandbags=loadImage("island-sandbags.png");
}

/*---------------------------------------------------------------------------------------------------------------------
Mouse was clicked. Behavior depends on internal status
---------------------------------------------------------------------------------------------------------------------*/

void mouseClicked () {
  if (myIslandIndex == -1) return;                                    // If you're not an active player, you shouldn't be here
  if (allowClick) {                                                   // In this case we should select a tile from the board
    var clickX=Math.floor((mouseX-islandStartX)/islandSizeSquare);
    var clickY=Math.floor((mouseY-islandStartY)/islandSizeSquare);
    if (clickX<0 || clickX>5 || clickY<0 || clickY>5) actionMsg.action=-1;
    switch (actionMsg.action) {                                       // Verify that the user clicked on a valid tile
      case -1:                                                        // No-Op
        break;
      case 1:                                                         // Move
        if (!islandCheck.move[clickX][clickY])                        // if clicking in the wrong place
          actionMsg.action=-1;                                        // turn into a No-Op
        break;
      case 2:                                                         // Move another player
        if (!islandCheck.move[clickX][clickY])                        // if clicking in the wrong place
          actionMsg.action=-1;                                        // turn into a No-Op
        if (actionMsg.otherPlayer == -1) {
          console.log("Error - otherPlayer not defined");
          return;
        }
        break;
      case 3:                                                         // Shore-Up
        if (!islandCheck.shoreUp[clickX][clickY])                     // if clicking in the wrong place
          actionMsg.action=-1;                                        // turn into a No-Op
        break;
      case 8:                                                         // Helicopter
        var hCount=0;
        if (actionMsg.playerBitmap == 0) {                            // did not select players yet
          for (var i=0; i<islandInfo.numPlayers;i++) {       // select subset of players standing on this tile
            if (islandInfo.players[i].x==clickX && islandInfo.players[i].y==clickY) {
              hCount++;
//              $("#helicopterRide button:nth-of-type("+(i+1)+")").css('background',("#"+('00000' + (playerTypes[islandInfo.players[i].role].color & 0xFFFFFF).toString(16)).substr(-6)));
              $("#helicopterRide button:nth-of-type("+(i+1)+")").css('background','#FFFFFF');
              $("#helicopterRide button:nth-of-type("+(i+1)+")").css('color',("#"+('00000' + (playerTypes[islandInfo.players[i].role].color & 0xFFFFFF).toString(16)).substr(-6)));
//              $("#helicopterRide button:nth-of-type("+(i+1)+")").css('color','#FFFFFF');
              $("#helicopterRide button:nth-of-type("+(i+1)+")").show();
//              actionMsg.playerBitmap |= 1<<i;
            }
            else
              $("#helicopterRide button:nth-of-type("+(i+1)+")").hide();
          }
          if (hCount > 0) {
            if (islandInfo.board[clickX][clickY]==0 &&                // If we're on Fool's landing,
                actionMsg.playerBitmap==2^islandInfo.numPlayers-1 &&  // ... and all players are on that tile
                islandInfo.collected[0] && islandInfo.collected[1] && islandInfo.collected[2] && islandInfo.collected[3] // ... and collected all treasures
               ) {
              actionMsg.action=100;                                   // Action 100: game over successfully - share the good news with the server
              sendAction();
              return;
            }
            if (hCount>1) {                                             // Only if there is more than one rider, ask to select riders.
              $("#helicopterRide p").show();
              $("#helicopterRide").slideDown();
            }
            else {
              $(islandMessage).text("Select the tile to air-lift players TO");
              noFill();
              stroke(#00ff00);                                        // mark all possible destination in green
              strokeWeight(2);
              for (var i=0;i<6;i++)
                for (var j=0;j<6;j++)
                  if (islandInfo.board[i][j]>=0)
                    rect(islandStartX+islandSizeSquare*i,islandStartY+islandSizeSquare*j,islandSizeSquare,islandSizeSquare,10);
              stroke(#ff0000);                                        // mark source in red
              rect(islandStartX+islandSizeSquare*clickX,islandStartY+islandSizeSquare*clickY,islandSizeSquare,islandSizeSquare,10);
            }
            return;                                                   // go to next step - click on the target tile
          }
          else                                                        // if selected a tile with no player on it
            actionMsg.action=-1;                                      //  than turn into a No-Op
        }
        else {                                                        // select flight target
          if (islandInfo.board[clickX][clickY]<0)                     // if trying to land on illegal spot
            actionMsg.action=-1;                                      //   than turn into a No-Op
          else {
            var pl;
            if (actionMsg.playerBitmap&1) pl=0;
            else if (actionMsg.playerBitmap&2) pl=1;
            else if (actionMsg.playerBitmap&4) pl=2;
            else pl=3;
            if (clickX==islandInfo.players[pl].x && clickY==islandInfo.players[pl].y)
               actionMsg.action=-1;                                   // don't fly to the flight source
          }
        }
        break;
      case 9:                                                         // SandBags
          if (islandInfo.board[clickX][clickY]<100)                   // if tile is not flooded
            actionMsg.action=-1;                                      // turn into a No-Op
        break;
      default:
        console.log("Error: mouseClicked should not be allowed");
        return;
    }
    actionMsg.X=clickX;
    actionMsg.Y=clickY;
    sendAction();
    allowClick=false;
    return;
  }

  switch (actionMsg.action) {                                         // There was no need to click on the board. What other action?
    case 6:                                                           // Action 6: need to click on Treasure pile
      if (mouseX>islandSizeSquare*2.6 && mouseX<islandSizeSquare*3.6 && mouseY>islandSizeSquare*0.5 && mouseY<islandSizeSquare*2) {
        sendAction();
        return;
      }
      break;                                                          // It is possible to discard/use treasure cards

    case 7:                                                           // Action 7: need to click on Flood pile
      if (mouseX>islandSizeSquare*1.4 && mouseX<islandSizeSquare*2.4 && mouseY>islandSizeSquare*0.5 && mouseY<islandSizeSquare*2) {
        sendAction();
        return;
      }
      break;                                                          // It is possible to discard/use treasure cards

    case 2:                                                           // Action 2: Move other player
      if (actionMsg.otherPlayer == -1) {                              // Only in the case that we don't know the other player
        for (var i=0; i<islandInfo.numPlayers; i++) {
          if (i!=myIslandIndex &&
              mouseX>islandSizeSquare*5.0     && mouseX<islandSizeSquare*9.8 &&
              mouseY>islandSizeSquare*(i+0.1) && mouseY<islandSizeSquare*(i+0.95)) {
            actionMsg.otherPlayer=i;
            playerRole=islandInfo.players[actionMsg.otherPlayer].role;
            if (playerRole==0) playerRole=1;
            islandCheckMove(actionMsg.otherPlayer,playerRole);
            if (islandCheck.moveOK) {
              allowClick=true;                                           // wait for user to click the square to move
              noFill();
              stroke(#00ff00);
              strokeWeight(2);
              for (var i=0;i<6;i++)
                for (var j=0;j<6;j++)
                  if (islandCheck.move[i][j])
                    rect(islandStartX+islandSizeSquare*i,islandStartY+islandSizeSquare*j,islandSizeSquare,islandSizeSquare,10);
            }

            return;                                                   // go to next step of selecting a card
          }
        }
        actionMsg.action=-1;                                          // if I'm still here than no player was selected - just give up
        sendAction();
        return;
      }
      break;

    case 4:                                                           // Action 4: Give treasure card
      if (actionMsg.otherPlayer == -1) {                              // Only in the case that we don't know the target player
        for (var i=0; i<islandInfo.numPlayers; i++) {
          if (islandCheck.transferMask[i] &&
              mouseX>islandSizeSquare*5.0     && mouseX<islandSizeSquare*9.8 &&
              mouseY>islandSizeSquare*(i+0.1) && mouseY<islandSizeSquare*(i+0.95)) {
            actionMsg.otherPlayer=i;
            islandSelectTransferCard();
            return;                                                   // go to next step of selecting a card
          }
        }
        actionMsg.action=-1;                                          // if I'm still here than no player was selected - just give up
        sendAction();
        return;
      }
      break;
  }

                                                                      // Now check if I'm clicking a treasure card
  if (mouseY > islandSizeSquare*(myIslandIndex+0.15)  && mouseY < islandSizeSquare*(myIslandIndex+0.90)) {
    for (var j=0;j<6;j++) {
      if (islandInfo.playerCards[myIslandIndex][j] >= 0 && mouseX > islandSizeSquare*(6.1+j*0.65) && mouseX < islandSizeSquare*(6.65+j*0.65)) {
        actionMsg.cardIndex=j;
        var card=treasureCardType[islandInfo.playerCards[myIslandIndex][j]];
        if (actionMsg.action==4) {                                    // A player wants to transfer a card to another player.
          if (card.treasure == -1)                                     // check if it's not a treasure card (helicopter or sandbags)
            actionMsg.action=-1;                                       // just give up
          sendAction();
        }
        else {                                                        // A player just clicked the card anytime. Need to check if to use or discard
          if (card.treasure > -1) {
            sweetAlert({   title: "Discard treasure card?",
                           showCancelButton: true,
                           imageUrl: "island-all-treasures.png",
                           imageSize: "400x100",
                           confirmButtonText: "Yes, discard it!",
                           cancelButtonText: "I didn't mean that",
                          }, function(isConfirm){
                             if (isConfirm) {
                                actionMsg.action=10;                  // Action 10: discard a treasure card
                                sendAction();
                             }  });
          }
          else if (card.sandbags) {
            actionMsg.action=9;                                       // Action 9: Use sandbag
            allowClick=true;
            $(islandMessage).text("Select any flooded tile to restore");

            noFill();
            stroke(#00ff00);
            strokeWeight(2);
            for (var i=0;i<6;i++)
              for (var j=0;j<6;j++)
                if (islandInfo.board[i][j]>=100)
                  rect(islandStartX+islandSizeSquare*i,islandStartY+islandSizeSquare*j,islandSizeSquare,islandSizeSquare,10);
          }
          else if (card.helicopter) {
            actionMsg.action=8;                                       // Action 8: Use helicopter
            actionMsg.playerBitmap=0;
            allowClick=true;
            $(islandMessage).text("Select the tile FROM which to pick-up players");
            noFill();
            stroke(#00ff00);
            strokeWeight(2);
            for (var i=0;i<islandInfo.numPlayers;i++)
              rect(islandStartX+islandSizeSquare*islandInfo.players[i].x,islandStartY+islandSizeSquare*islandInfo.players[i].y,islandSizeSquare,islandSizeSquare,10);
          }
        }
        return;
      }
    }
  }
  actionMsg.action=-1;                                          // if I'm still here than nothing was done - just give up
  sendAction();
}


// To Do
// select parameters: confirm discard, start level,
// improve action-keys
