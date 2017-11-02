'use strict';


/**
 * The ID of the currently signed-in User. We keep track of this to detect Auth state change events that are just
 * programmatic token refresh but not a User status change.
 */
var currentUID=-1;
var gameID=-1;
var newGID=-1;
var db = firebase.database();
var auth = firebase.auth();
var gameInfo={};
var gameMsg=null;
var debugLevel=2;

function debug(level, msg) {
  switch (level) {
    case 0: console.error(msg);
       break;
    case 1: console.warn(msg);
       break
    default: if (level<=debugLevel) console.log(msg);
  }
}

function sendReq(obj) {
    db.ref('/req1/'+currentUID).set(obj);
    debug(1,obj.game+" message: "+obj.msg);
    debug(2,obj);
}

function doSignIn(user) {
  var displayName=user.displayName;
  var photoURL=user.photoURL;
  currentUID=user.uid;
  $("#splashPage").hide();
  if (user.isAnonymous) {
    displayName="Guest";
    photoURL="silhouette.png";
    $("#editProfileButton").attr("disabled",true);
    $(".NewGame").attr("disabled",true);
    user.updateProfile({
      displayName: displayName,
      photoURL: photoURL
    });
  }
  else {
    $("#editProfileButton").attr("disabled",false);
    $(".NewGame").attr("disabled",false);
    db.ref('users/' + currentUID).set({
      username: displayName,
      profile_picture : photoURL,
    });
  }
  $("#welcomeMsg").html(displayName);
  $("#welcomePic").attr('src',photoURL);
  $("#userMenu").show();
}

// Bindings on load.
window.addEventListener('load', function() {
  debug(2,"loading now");
  $("#signInEmail").parent().get(0).MaterialTextfield.checkDirty();
  $("#signInPass").parent().get(0).MaterialTextfield.checkDirty();
  var sizeSquare=Math.floor(Math.min(window.innerWidth/10,window.innerHeight/12));
  $(".game-content").css("width",sizeSquare*10);
  $(".game-content").css("height",sizeSquare*12);

  // From Sign-in switch to Forgot password
  $('#forgotPasswordLink').click( function() {
    $("#forgotEmail").val($("#signInEmail").val());
    $("#forgotEmail").parent().get(0).MaterialTextfield.checkDirty();
    $("#signInModal").hide();
    $("#forgotModal").show();
  });

  // From Sign-in switch to Sign-up
  $('#signUpLink').click( function() {
    $("#signUpEmail").val($("#signInEmail").val());
    $("#signUpEmail").parent().get(0).MaterialTextfield.checkDirty();
    $("#signUpPass").val($("#signInPass").val());
    $("#signUpPass").parent().get(0).MaterialTextfield.checkDirty();
    $("#signUpModal").show();
    $("#signInModal").hide();
  });

  // From Sign-up switch to Sign-in
  $('#signInLink').click( function() {
    $("#signInEmail").val($("#signUpEmail").val());
    $("#signInEmail").parent().get(0).MaterialTextfield.checkDirty();
    $("#signInPass").val($("#signUpPass").val());
    $("#signInPass").parent().get(0).MaterialTextfield.checkDirty();
    $("#signInModal").show();
    $("#signUpModal").hide();
  });

/*------------------------------------------------------------------------------
// Email Sign-in
------------------------------------------------------------------------------*/
  $('#signInEmailButton').click( function() {
    if ($("#signInEmail").val().length < 1) {
      $("#loginMsg").html("Please enter a valid email");
      return;
    }
    if ($("#signInPass").val().length < 1) {
      $("#loginMsg").html('Please enter a password.');
      return;
    }
    auth.signInWithEmailAndPassword($("#signInEmail").val(), $("#signInPass").val())
      .then(function() {
        var user=auth.currentUser;
        if (!user) {
          debug(0,'Error: Login success and no user?');
          return;
        }
/* email verification - currently disabled
        if (!user.emailVerified) {
          auth.signOut();
          loginMsg.innerHTML='Please check your email, and verify the account';
          return;
        }
*/
      })
      .catch(function(error) {
          var errorCode = error.code;
          var errorMessage = error.message;
          if (errorCode === 'auth/wrong-password') {
            $("#loginMsg").html('Wrong password.');
          } else {
            $("#loginMsg").html(errorMessage);
          }
          debug(0,error);
      });
  });

/*------------------------------------------------------------------------------
// Send reset email
------------------------------------------------------------------------------*/
  $('#sendEmailButton').click( function() {
    auth.sendPasswordResetEmail($("#forgotEmail").val())
      .then(function() {
        $("#signInEmail").val($("#forgotEmail").val());
        $("#signInEmail").parent().get(0).MaterialTextfield.checkDirty();
        $("#loginMsg").html('Reset password was sent. Check you email');
        $("#forgotModal").hide();
        $("#signInModal").show();
      })
      .catch(function(error) {
          var errorCode = error.code;
          var errorMessage = error.message;
          $("#forgotMsg").html(errorMessage);
          debug(0,error);
      });
  });

  $('#cancelForgetButton').click( function() {
    $("#forgotModal").hide();
    $("#signInModal").show();
  });


/*------------------------------------------------------------------------------
// Create new user
------------------------------------------------------------------------------*/
  $('#createUserButton').click( function() {
    if ($("#displayName").val().length < 1) {
      $("#signUpMsg").html("Please enter your display name");
      return;
    }
    if ($("#signUpEmail").val().length < 1) {
      $("#signUpMsg").html("Please enter a valid email");
      return;
    }
    if ($("#signUpPass").val().length < 1) {
      $("#signUpMsg").html('Please enter a password.');
      return;
    }
    if ($("#signUpPass").val() != $("#signUpPass2").val()) {
      $("#signUpMsg").html('Passwords does not match.');
      return;
    }
    auth.createUserWithEmailAndPassword($("#signUpEmail").val(), $("#signUpPass").val())
      .then(function () {
        auth.currentUser.updateProfile({
          displayName: $("#displayName").val(),
          photoURL: "silhouette.png"
        }).then(function() {
/* email verification - currently disabled
          auth.currentUser.sendEmailVerification();
          auth.signOut();
          loginMsg.innerHTML='Please check your email, and verify the account';
*/
          $("#welcomeMsg").html(auth.currentUser.displayName);
          $("#welcomePic").attr('src',auth.currentUser.photoURL);
          $("#signInModal").show();
          $("#signUpModal").hide();
        });
      })
      .catch(function(error) {
        var errorCode = error.code;
        var errorMessage = error.message;
        $("#signUpMsg").html(errorMessage);
      });
  });

/*------------------------------------------------------------------------------
// Google Sign-in
------------------------------------------------------------------------------*/
  $('#signInGoogleButton').click( function() {
    var provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
      .then(function() {
        var user=auth.currentUser;
        if (!user) {
          debug(0,'Error: Google login success and no user?');
          return;
        }
      })
  });

/*------------------------------------------------------------------------------
// Facebook Sign-in
------------------------------------------------------------------------------*/
  $('#signInFacebookButton').click( function() {
    var provider = new firebase.auth.FacebookAuthProvider();
    auth.signInWithPopup(provider)
      .then(function() {
        var user=auth.currentUser;
        if (!user) {
          debug(0,'Error: Facebook login success and no user?');
          return;
        }
      })
  });

/*------------------------------------------------------------------------------
// Guest Sign-in
------------------------------------------------------------------------------*/
  $('#signInGuestButton').click( function() {
    auth.signInAnonymously()
      .then(function() {
        var user=auth.currentUser;
        if (!user) {
          debug(0,'Error: Guest login success and no user?');
          return;
        }
      })
      .catch(function(error) {
        var errorCode = error.code;
        var errorMessage = error.message;
        alert(errorMessage);
        debug(0,error);
      });
  });

/*------------------------------------------------------------------------------
// Sign-out
------------------------------------------------------------------------------*/
  $('#signOutButton').click( function() {
    var user=auth.currentUser;
    if (!user) {
      debug(0,'Error: trying to logout and no user?');
      return;
    }
    if (user.isAnonymous)
      user.delete();
    else
      auth.signOut();
  });

  // Listen for auth state changes
  auth.onAuthStateChanged(onAuthStateChanged);

}, false);


// When the user clicks anywhere outside of the modal, close it

window.onclick = function(event) {
  if (event.target == forgotModal) {
      $("#forgotModal").hide();
      $("#signInModal").show();
  }
  if (event.target == chessBoard) {
      $("#chessBoard").hide();
      newGID= -1;
      gameMsg="chess";
  }
  if (event.target.classList.contains('allowClose')) {
    event.target.style="display:none";
  }
}


/*------------------------------------------------------------------------------
// Firebase Auth changed: either login or logout
------------------------------------------------------------------------------*/
function onAuthStateChanged(user) {
  // We ignore token refresh events.
  if (user && currentUID === user.uid) {
    debug(1,"Auth: No change");
    return;
  }
  if (!user) {
    debug(1,"Auth: Logout event");
    $(".gameLists").empty();   // clear all the lists
    $("#userMenu").hide();
    $("#splashPage").show();
    $(".gameButtons").attr("disabled",true);
    currentUID=-1;
    return;
  }
  debug(1,"Auth: Login "+user.displayName);
  doSignIn(user);

  var ref = db.ref("gameInfo");

  ref.on("child_added", addGameToList);

  ref.on("child_changed", function(snapshot) {
    removeFromList(snapshot.val());
    addGameToList(snapshot);
  });

  ref.on("child_removed", function(snapshot) {
    removeFromList(snapshot.val());
  });
}

/*------------------------------------------------------------------------------
// Update list of games whenever gameInfo entry is added/removed/changed
------------------------------------------------------------------------------*/

function addGameToList(snapshot) {
  var game=snapshot.val();
  var active=false;
  gameInfo[game.gid]=game;
  var node = document.createElement("button");
  node.id="line-"+game.game+"-"+game.gid;
  node.value=game.gid;
  node.style="width:350px; margin: auto ";
//mdl-menu__item--full-bleed-divider
  node.className = "mdl-list__item mdl-list__item--two-line ";
  var sp=document.createElement("span");
  sp.className="mdl-list__item-primary-content";
  node.appendChild(sp);
  var pic = document.createElement("img");
  pic.width="40";
  pic.height="40";
  pic.className="mdl-list__item-secondary-content";
  node.appendChild(pic);
  var first=true;
  for  (var player in game.players) {
    var thisPlayer=game.players[player];
    var pnode = document.createElement("span");

    if (thisPlayer.uid==currentUID) {
       active=true;
       if (first) pic.src=thisPlayer.photoURL;  // use my picture only if I'm the only one
       pnode.innerHTML="I'm playing "+player;
       pnode.className = "mdl-list__item-sub-title";
       sp.appendChild(pnode);
    }
    else {
      pnode.innerHTML=thisPlayer.displayName+" playing "+player;
      if (first) {
        pic.src=thisPlayer.photoURL;
        first=false;
        sp.prepend(pnode);
      }
      else {
        pnode.className = "mdl-list__item-sub-title";
        sp.appendChild(pnode);
      }
    }
  }
  if (game.currentUID==currentUID) {
    addToList(game.game,"Active",node);
  }
  else if (game.status=="pending") {
    addToList(game.game,"Pending",node);
  }
  else
    addToList(game.game,"Watch",node);

  $("#"+node.id).click( function() {
    debug(2,"Game selected:"+this.id);
    newGID=this.value;
    this.parentElement.parentElement.style="display:none";
    $("#chessBoard").show();
    gameMsg="chess";
  });
}

function addToList(game,list,node) {
    debug(2,"Add "+node.value+" to "+list);
    debug(3,gameInfo);
    var listName="#"+game+list+"List";
    $(listName).append(node);
    if (list=="Active") {
      var nActive=$(listName)[0].children.length;
      if (nActive==1) $("#"+game+"Badge").addClass("mdl-badge");
      $("#"+game+"Badge").attr("data-badge",nActive);
    }
    $("#"+game+list+"ListButton").attr("disabled", false);
}

function removeFromList(game) {
    delete gameInfo[game.gid];
    var node=$("#line-"+game.game+"-"+game.gid);
    var pnode=node.parent();
    node.remove();
    if (pnode.hasClass("Active")) {
      var nActive=pnode.children().length;
      if (nActive==0) $("#"+game.game+"Badge").removeClass("mdl-badge");
      else $("#"+game.game+"Badge").attr("data-badge",nActive);
    }
    if (pnode.children().length<1)       // No more items in the list
      $("#"+pnode.prop('id')+"Button").attr("disabled",true);
}


// -----------------------------------  Edit Profile --------------------------------------------------------------------------------------


$("#editProfileButton").click( function() {
  if(!this.hasAttribute("disabled")) {
    $("#updatePic").attr('src',auth.currentUser.photoURL);
    $("#displayNameUpdate").val(auth.currentUser.displayName);
    $("#displayNameUpdate").parent().get(0).MaterialTextfield.checkDirty();
    $("#editProfileModal").show();
  }
});

$("#profileSend").click( function() {
  if ($("#displayNameUpdate").val() != auth.currentUser.displayName) {
    auth.currentUser.updateProfile({
      displayName: $("#displayNameUpdate").val(),
    }).then(function(snapshot){
      $("#welcomeMsg").html(auth.currentUser.displayName);
      db.ref('users/' + currentUID).set({   // also update in database
        displayName : auth.currentUser.displayName,
      });
    });
  }
  if ($("#uploadBtn").val()) {
    var fileRef = firebase.storage().ref().child("img/"+currentUID+".jpg");
    fileRef.put($("#uploadBtn")[0].files[0]).then(function(snapshot) {
      auth.currentUser.updateProfile({
        photoURL: snapshot.downloadURL
      }).then(function(snapshot){
          $("#welcomePic").attr('src',auth.currentUser.photoURL);
          db.ref('users/' + currentUID).set({   // also update in database
            profile_picture : auth.currentUser.photoURL,
          });
        });
    });
  }
  $("#editProfileModal").hide();
});

$("#profileCancel").click( function() {
  $("#editProfileModal").hide();
});


$("#uploadBtn").change(function () {
	var img=document.getElementById("updatePic");
	var newPic=this.files[0];
    $("#uploadFile").html(newPic.name);
    var reader = new FileReader();
    reader.onload = function(){
      img.src = reader.result;
    };
    reader.readAsDataURL(newPic);
});
