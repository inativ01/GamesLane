// the next line is very important for using images in JS
/* @pjs preload="Chess/chess-pieces.png,Chess/red-x.png,Chess/chessboard_full.gif"; */

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

var board1=[	[10, 9, 8, 7, 6, 8, 9,10],                            // -1 is an empty slot, 0-5 white pieces, 6-11 black pieces
		[11,11,11,11,11,11,11,11],
		[-1,-1,-1,-1,-1,-1,-1,-1],
		[-1,-1,-1,-1,-1,-1,-1,-1],
		[-1,-1,-1,-1,-1,-1,-1,-1],
		[-1,-1,-1,-1,-1,-1,-1,-1],
		[ 5, 5, 5, 5, 5, 5, 5, 5],
		[ 4, 3, 2, 1, 0, 2, 3, 4]];

var sizeSquare = 6, startX = 6, startY = 6;                           // control the size and location of the board
var mode="passive";                                                   // "passive" - my player is not playing
                                                                      // "edit" - edit the board
var images=[];                           // array to hold the images of the various pieces
var editPiece= -1;
var pieces=loadImage("Chess/chess-pieces.png");                                        // fill up array of images of all black and white pieces
var redx=loadImage("Chess/red-x.png");
var fullboard=loadImage("Chess/chessboard_full.gif");

// Define functions
// -----------------

// Button-click events

window.addEventListener('resize', function() {
  sizeSquare=Math.floor(Math.min(window.innerWidth/10,window.innerHeight/12));
  $("#ChessOptionsContent").css("width",sizeSquare*10);
  printBoard();
});

$("#ChessNewButton").click( function() {
  if (!auth.currentUser.isAnonymous) {
    mode="passive";
    $("#chessButtonEdit").show();
    $("#chessEditCanvas").hide();
    $("#ChessOptionsBoard").show();
    $("#ChessOptionsHeader").show();
    $("#chessButtonEdit").html("Edit Board");
    for(var i = 0; i < 8; i++) {
      for(var j = 0; j < 8; j++) {
        board[i][j] = board1[i][j];
      }
    }
    mode="passive";
  }
});

$("#chessCancelEdit").click(function() {
    $("#ChessOptionsBoard").hide();
});

$("#chessButtonEdit").click(function() {
  if(mode=="edit") { // end of edit mode
    mode="passive";
    $("#ChessOptionsHeader").show();
    $("#chessEditCanvas").hide();
    $("#chessButtonEdit").html("Edit Board");
  } else if(mode == "passive") { // start of edit mode
    mode="edit";
    $("#ChessOptionsHeader").hide();
    $("#chessButtonEdit").html("Stop Edit");
    $("#chessButtonEdit").show();
    printBoard();
  }
});

$('#startChessButton').click(function() {
  newGID=Math.floor(Math.random() * (1000000000000));
  sendReq({
    game:"Chess",
    gid:newGID,
    uid:currentUID,
    msg: "Start",
    role: $("#chessRole").val(),
    board: board,
    displayName: auth.currentUser.displayName,
    photoURL: auth.currentUser.photoURL
  });
  gameMsg="chess";
  $("#ChessOptionsBoard").hide();
  $(".mdl-spinner").addClass("is-active");
});



//*************************************************************************************************
//   This function prints out the board based on the board array
//*************************************************************************************************
function printBoard() {
  size(sizeSquare*10,sizeSquare*10);
  startX=startY=sizeSquare;
  startY=0;
  stroke(0);
  fill(#0000FF);
  textFont(loadFont("Meta-Bold.ttf"));

  for(var y = 0, ypos=startY; y < 8; y++, ypos+=sizeSquare) {
    for(var x = 0, xpos=startX; x < 8; x++, xpos+=sizeSquare) {
      if((x+y)%2) fill(100); else fill(255);  // select white or black squares
      rect(xpos,ypos,sizeSquare,sizeSquare);  // print an empty square
      if (board[y][x]> -1)
        image(images[board[y][x]], xpos, ypos ,sizeSquare,sizeSquare);  // print the image of the piece based on the value
    }
  }
  image(pieces,startX+sizeSquare, sizeSquare*8,sizeSquare*6,sizeSquare*2);
  image(redx,startX+sizeSquare*7, sizeSquare*8, sizeSquare,sizeSquare);
  image(fullboard,startX+sizeSquare*7, sizeSquare*9, sizeSquare,sizeSquare);
  noFill();
  stroke(0);
  strokeWeight(2);
  // displays image of editPiece. if editPiece is -1 displays a red cross
  if(editPiece == -1) {
    image(redx,0,sizeSquare*8,sizeSquare*2,sizeSquare*2);
  }
  else {
    image(images[editPiece],0,sizeSquare*8,sizeSquare*2,sizeSquare*2);
  }
  $("#chessEditCanvas").show();
}


//*************************************************************************************************
// return object with board coordinate of the mouse - if it's inside the board
//*************************************************************************************************
function mouseSquare()
{
  var mouse={x:-1, y:-1} ;
  if (mouseX >= startX && mouseX < startX+sizeSquare*8 && mouseY >= startY && mouseY < startY+sizeSquare*8) {
    mouse.x=Math.floor((mouseX-startX)/sizeSquare);
    mouse.y=Math.floor((mouseY-startY)/sizeSquare);
  }
  return mouse;
}



//*************************************************************************************************
// Initialization
//*************************************************************************************************
void setup() {
  sizeSquare=Math.floor(Math.min(window.innerWidth/10,window.innerHeight/12));
  $("#ChessOptionsContent").css("width",sizeSquare*10);
  size(sizeSquare*10,sizeSquare*10);
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
  debug(2,"mouseClicked. Mode="+mode);
  switch (mode) {

    case "edit":  // Adam: do this part
// if inside the board: put the editPiece on the relevant square
      mouse=mouseSquare();
      if(mouse.x > -1) {
        board[mouse.y][mouse.x] = editPiece;
      }
// if on one of the pieces on the bottom: changes editPiece to the select piece
      else if (mouseX >= sizeSquare*2 && mouseX < sizeSquare*8 && mouseY >= sizeSquare*8 && mouseY < sizeSquare*10) {
        var x=Math.floor((mouseX-sizeSquare*2)/sizeSquare);
        var y=Math.floor((mouseY-sizeSquare*8)/sizeSquare);
        editPiece=x+6*y;
      }

// if on the red X : set editPiece to -1
      else if(mouseX >= sizeSquare*8 && mouseX < sizeSquare*9 && mouseY >= sizeSquare*8 && mouseY < sizeSquare*9) {
        editPiece = -1;
      }
// if on the full board: copy it from "board1"
      else if(mouseX >= sizeSquare*8 && mouseX < sizeSquare*9 && mouseY >= sizeSquare*9 && mouseY < sizeSquare*10) {
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


