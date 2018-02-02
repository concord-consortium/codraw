/* global firebase require module */
var queryString = require('query-string');
var uuid = require('uuid');

function FirebaseUndoRedo() {
  this.user = null;
  this.token = null;
  var params = queryString.parse(location.hash);
  this.refName = params.firebaseKey || 'default';
  this.newRefName = params.makeCopy ? uuid.v1() : params.newKey || null;

  var hashParams = queryString.parse(location.hash.substring(1));
  this.ignoreIframe = hashParams.ignoreIframe === "true";
  this.isClone = hashParams.sharing_clone && (hashParams.sharing_clone !== this.refName);
  if (this.isClone) {
    this.newRefName = hashParams.sharing_clone;
  }

  this.lastData = {};
  this.config = {
    apiKey: 'AIzaSyDUm2l464Cw7IVtBef4o55key6sp5JYgDk',
    authDomain: 'colabdraw.firebaseapp.com',
    databaseURL: 'https://colabdraw.firebaseio.com',
    storageBucket: 'colabdraw.appspot.com',
    messagingSenderId: '432582594397'
  };
  firebase.initializeApp(this.config);
}

FirebaseUndoRedo.prototype.init = function(options) {
  this.options = options;

  var context = options.context;
  if (context && (context.class !== "default")) {
    this.newRefName = ["classes/", context.class, "/groups/", context.group, "/offerings/", context.offering, "/item/", context.id].join("")
  }

  var finishAuth = this.finishAuth.bind(this);
  var reqAuth    = this.reqAuth.bind(this);
  var log        = this.log.bind(this);
  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      finishAuth({result: {user: user}});
    } else {
      reqAuth();
    }
  });
};

FirebaseUndoRedo.prototype.log = function(mesg) {
  console.log(mesg);
};

FirebaseUndoRedo.prototype.error = function(error) {
  console.error(error);
};

FirebaseUndoRedo.prototype.rewriteParams = function() {
  var params = queryString.parse(location.hash);
  params.firebaseKey = this.newRefName;
  delete params.newKey;
  delete params.makeCopy;
  location.hash = queryString.stringify(params);
};

FirebaseUndoRedo.prototype.reqAuth = function() {
  firebase.auth().signInAnonymously()
  .then(this.finishAuth.bind(this))
  .catch(this.failAuth.bind(this));
};

FirebaseUndoRedo.prototype.failAuth = function(error) {
  var errorMessage = error.message;
  var email = error.email;
  this.error(['could not authenticate', errorMessage, email].join(' '));
};

FirebaseUndoRedo.prototype.finishAuth = function(result) {
  this.user = result.user;
  this.setDataRef(this.refName);
  this.replaceUndoRedo();
};

FirebaseUndoRedo.prototype.setDataRef = function(refName) {
  this.dataRef = firebase.database().ref(refName);
};

FirebaseUndoRedo.prototype.createSharedUrl = function () {
  var sharedFirebaseKey = uuid.v1();
  var sharedRef = firebase.database().ref(sharedFirebaseKey);
  this.dataRef.once("value", function (snapshot) {
    sharedRef.set(snapshot.val());
  });
  var a = document.createElement("a");
  a.href = window.location.href;
  a.hash = queryString.stringify({firebaseKey: sharedFirebaseKey});
  return a.toString();
};

FirebaseUndoRedo.prototype.replaceUndoRedo = function() {

  var finish = function (refPath) {
    this.options.drawingTool.replaceUndoRedo(DrawingTool.FirebaseUndoRedo, {
      firebase: firebase,
      refPath: refPath,
      loadFilter: function (state) {
        // don't sync drawing canvas size
        if (state) {
          delete state.dt;
        }
        return state;
      }
    });
  }.bind(this);

  // check if we need to copy the document
  if (this.newRefName) {
    var srcRef = firebase.database().ref(this.refName);
    var destRef = firebase.database().ref(this.newRefName);
    srcRef.once("value", function (snapshot) {
      destRef.update(snapshot.val(), function () {
        srcRef.off();
        destRef.off();
        finish(this.newRefName);
      }.bind(this))
    });
  }
  else {
    finish(this.refName);
  }
};

module.exports = FirebaseUndoRedo;
window.FirebaseUndoRedo = FirebaseUndoRedo;