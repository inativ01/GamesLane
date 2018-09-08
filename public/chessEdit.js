// the next line is very important for using images in JS
/* @pjs preload="../pics/CHESS-pieces.png"; */

// Define global variables
// -----------------------

var board=[[-1,-1,-1,-1,-1,-1,-1,-1],
           [-1,-1,-1,-1,-1,-1,-1,-1],
           [-1,-1,-1,-1,-1,-1,-1,-1],
           [-1,-1,-1,-1,-1,-1,-1,-1],
           [-1,-1,-1,-1,-1,-1,-1,-1],
           [-1,-1,-1,-1,-1,-1,-1,-1],
           [-1,-1,-1,-1,-1,-1,-1,-1],
           [-1,-1,-1,-1,-1,-1,-1,-1]];

var board1=[  [10, 9, 8, 7, 6, 8, 9,10],                            // -1 is an empty slot, 0-5 white pieces, 6-11 black pieces
    [11,11,11,11,11,11,11,11],
    [-1,-1,-1,-1,-1,-1,-1,-1],
    [-1,-1,-1,-1,-1,-1,-1,-1],
    [-1,-1,-1,-1,-1,-1,-1,-1],
    [-1,-1,-1,-1,-1,-1,-1,-1],
    [ 5, 5, 5, 5, 5, 5, 5, 5],
    [ 4, 3, 2, 1, 0, 2, 3, 4]];

var pixelSize;
var mode="passive";                                                   // "passive" - my player is not playing
                                                                      // "edit" - edit the board
var images=[];                           // array to hold the images of the various pieces
var editPiece= -1;
var pieces=loadImage("../pics/CHESS-pieces.png");                                        // fill up array of images of all black and white pieces
var redx=loadImage("../pics/red-x.png");
var fullboard=loadImage("../pics/CHESS-icon.gif");

// Define functions
// -----------------

// Button-click events

window.addEventListener('resize', function() {
  pixelSize=Math.min(window.innerWidth,(window.innerHeight-60))/1000;
  $("#chessOptionsContent").css("width",pixelSize*1000);
  if($("#chessOptionsBoard").is(":visible")) printBoard();
});

//*************************************************************************************************
//   go to the game Options screen
//*************************************************************************************************
$("#chessNewButton").click( function() {
  if (!auth.currentUser.isAnonymous) {
    mode="passive";
    $("#chessButtonEdit").show();
    $("#chessEditCanvas").hide();
    $("#chessOptionsBoard").show();
    $("#chessOptionsHeader").show();
    $("#chessButtonEdit").html("Edit Board");
    for(var i = 0; i < 8; i++) {
      for(var j = 0; j < 8; j++) {
        board[i][j] = board1[i][j];
      }
    }
    mode="passive";
  }
});

//*************************************************************************************************
//   exit the Options screen and don't start the game
//*************************************************************************************************
$("#chessCancelOptions").click(function() {
    $("#chessOptionsBoard").hide();
});

//*************************************************************************************************
//   Start/finish editing the board
//*************************************************************************************************
$("#chessButtonEdit").click(function() {
  if(mode=="edit") { // end of edit mode
    mode="passive";
    $("#chessOptionsHeader").show();
    $("#chessEditCanvas").hide();
    $("#chessButtonEdit").html("Edit Board");
  } else if(mode == "passive") { // start of edit mode
    mode="edit";
    $("#chessOptionsHeader").hide();
    $("#chessButtonEdit").html("Stop Edit");
    $("#chessButtonEdit").show();
    printBoard();
  }
});

//*************************************************************************************************
//   done with Options, start the game
//*************************************************************************************************
$('#chessStartButton').click(function() {
  do {
    newGID=Math.floor(Math.random() * (1000000000000))+1;
  } while (gameInfo[newGID]); // need to try again just in case the GID is taken
  gInfo={
    game:"chess",
    gid:newGID,
    playerList:[],
    currentPlayer:0,
    status:'pending'
  } ;
  gData={
    from:{x:0, y:0},
    to:{x:0, y:0},
    board: board,
    movedPiece:-1,
    newPiece:-1,
    toggle:0,
  };
  gInfo.playerList.push({
    role:$("#chessRole").val(),
    uid:currentUID,
    displayName:auth.currentUser.displayName,
    photoURL:auth.currentUser.photoURL,
  });
  db.ref("gameInfo/"+newGID).set(gInfo);
  db.ref("gameData/"+gInfo.game+"/"+newGID).set(gData);

  gameMsg="chess";
  $("#chessOptionsBoard").hide();
  $(".mdl-spinner").addClass("is-active");
});



//*************************************************************************************************
//   This function prints out the board based on the board array
//*************************************************************************************************
function printBoard() {
  size(pixelSize*1000,pixelSize*1000);
  scale(pixelSize,pixelSize); 
  stroke(0);
  fill(#0000FF);
  textFont(loadFont("Meta-Bold.ttf"));

  for(var y = 0, ypos=0; y < 8; y++, ypos+=100) {
    for(var x = 0, xpos=100; x < 8; x++, xpos+=100) {
      if((x+y)%2) fill(100); else fill(255);  // select white or black squares
      rect(xpos,ypos,100,100);  // print an empty square
      if (board[y][x]> -1)
        image(images[board[y][x]], xpos, ypos ,100,100);  // print the image of the piece based on the value
    }
  }
  image(pieces,200, 800, 600, 200);
  image(redx,800, 800, 100, 100);
  image(fullboard,800, 900, 100, 100);
  noFill();
  stroke(0);
  strokeWeight(2);
  // displays image of editPiece. if editPiece is -1 displays a red cross
  if(editPiece == -1) {
    image(redx,0,800,200,200);
  }
  else {
    image(images[editPiece],0,800,200,200);
  }
  $("#chessEditCanvas").show();
}


//*************************************************************************************************
// return object with board coordinate of the mouse - if it's inside the board
//*************************************************************************************************
function mouseSquare()
{
  var mx=mouseX/pixelSize, my=mouseY/pixelSize;
  var mouse={x:-1, y:-1} ;
  if (mx >= 100 && mx < 900 && my >= 0 && my < 800) {
    mouse.x=Math.floor(mx/100)-1;
    mouse.y=Math.floor(my/100);
  }
  return mouse;
}



//*************************************************************************************************
// Initialization
//*************************************************************************************************
void setup() {
  pixelSize=Math.min(window.innerWidth,(window.innerHeight-60))/1000;
  $("#chessOptionsContent").css("width",pixelSize*1000);
  for (var i=0; i<12; i++) {
    images[i]=createImage(333,333,RGB);
    if (i<6) images[i].copy (pieces, (i%6)*333,0,333,333,0,0,333,333);  // white pieces
    else images[i].copy (pieces, (i%6)*333,333,333,333,0,0,333,333);    // black pieces
  }
}



//*************************************************************************************************
// When mouse is clicked - behavior depends on the internal mode (state machine)
//*************************************************************************************************
void mouseClicked () {
  var mx=mouseX/pixelSize, my=mouseY/pixelSize;
  debug(2,"mouseClicked. Mode="+mode);
  switch (mode) {

    case "edit":  // Adam: do this part
// if inside the board: put the editPiece on the relevant square
      mouse=mouseSquare();
      if(mouse.x > -1) {
        board[mouse.y][mouse.x] = editPiece;
      }
// if on one of the pieces on the bottom: changes editPiece to the select piece
      else if (mx >= 200 && mx < 800 && my >= 800 && my < 1000) {
        var x=Math.floor(mx/100)-2;
        var y=Math.floor(my/100)-8;
        editPiece=x+6*y;
      }

// if on the red X : set editPiece to -1
      else if(mx >= 800 && mx < 900 && my >= 800 && my < 900) {
        editPiece = -1;
      }
// if on the full board: copy it from "board1"
      else if(mx >= 800 && mx < 900 && my >= 900 && my < 1000) {
         for(var i = 0; i < 8; i++) {
            for(var j = 0; j < 8; j++) {
              board[i][j] = board1[i][j];
            }
         }
      }
// anyway, at the end - print the board
      printBoard();
  }
}


