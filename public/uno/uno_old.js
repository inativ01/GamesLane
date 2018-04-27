// the next line is very important for using images in JS
/* @pjs preload="UNO_cards_deck.png"; */

/*---------------------------------------------------------------------------------------------------------------------
Initalize variables
---------------------------------------------------------------------------------------------------------------------*/
var uno_all_cards;

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





/*---------------------------------------------------------------------------------------------------------------------
Click button to start or stop Uno
---------------------------------------------------------------------------------------------------------------------*/
$('#unoButton').click(function() {
    if (activeGame==0) {
      $("#unoBoard").show();
      this.innerHTML="Stop Uno";
      $("#chessButton").prop("disabled",true);
      $("#islandButton").prop("disabled",true);
//      sock.emit('joinUno',-1);                                     // fake join - just to get the setup info
      activeGame=3;
      unoSize=Math.floor(min(window.innerWidth,window.innerHeight)*.8);
      size(unoSize,unoSize);
      background(#ffff00);
      image(uno_all_cards, 10, 10, 500, 500);
      image(uno_cards[14].c_image, 500, 500, 73, 109);
    }
    else if (activeGame==3)
    {
//      if (myUnoIndex >= 0) sock.emit('joinUno',-2);             // fake join - un-join
      $("#unoBoard").hide();
      this.innerHTML="Play Uno";
      $("#chessButton").prop("disabled",false);
      $("#islandButton").prop("disabled",false);
      activeGame=0;
    }
});



//*************************************************************************************************
// Initialization
//*************************************************************************************************
void setup() {
  uno_all_cards=loadImage("UNO_cards_deck.png");
  for (var i=0; i<54; i++)
    uno_cards[i].c_image=createImage(333,333,RGB);
  for (var j=0; j<4; j++)
    for (var i=0; i<13; i++)
      uno_cards[i+j*13].c_image.copy (uno_all_cards, i*73,j*109,73,109,0,0,73,109);  // white pieces

//  sock.emit('chessStatus', "Observer");                               // let the server know that I started (as observer)
}



