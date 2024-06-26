/* global firebase require module */
var queryString = require('query-string');
var _ = require('lodash');
var uuid = require('uuid');
var diff = require('deep-diff').default.diff;

function FirebaseImp() {
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
    apiKey: atob('QUl6YVN5RFVtMmw0NjRDdzdJVnRCZWY0bzU1a2V5NnNwNUpZZ0Rr'),
    authDomain: 'colabdraw.firebaseapp.com',
    databaseURL: 'https://colabdraw.firebaseio.com',
    storageBucket: 'colabdraw.appspot.com',
    messagingSenderId: '432582594397'
  };
  firebase.initializeApp(this.config);
}

FirebaseImp.prototype.init = function(context) {

  if (context && (context.class !== "default")) {
    this.newRefName = ["classes/", context.class, "/groups/", context.group, "/offerings/", context.offering, "/item/", context.id].join("")
  }

  var finishAuth = this.finishAuth.bind(this);
  var reqAuth    = this.reqAuth.bind(this);
  var log        = this.log.bind(this);
  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      //log(user.displayName + ' authenticated');
      finishAuth({result: {user: user}});
    } else {
      reqAuth();
    }
  });
};

FirebaseImp.prototype.log = function(mesg) {
  console.log(mesg);
};

FirebaseImp.prototype.error = function(error) {
  console.error(error);
};

FirebaseImp.prototype.rewriteParams = function() {
  var params = queryString.parse(location.hash);
  params.firebaseKey = this.newRefName;
  delete params.newKey;
  delete params.makeCopy;
  location.hash = queryString.stringify(params);
};

FirebaseImp.prototype.reqAuth = function() {
  firebase.auth().signInAnonymously()
  .then(this.finishAuth.bind(this))
  .catch(this.failAuth.bind(this));
};

FirebaseImp.prototype.failAuth = function(error) {
  var errorMessage = error.message;
  var email = error.email;
  this.error(['could not authenticate', errorMessage, email].join(' '));
};

FirebaseImp.prototype.finishAuth = function(result) {
  this.user = result.user;
  this.setDataRef(this.refName, "finishAuth");
  this.registerListeners();
  //this.log('logged in');
};

FirebaseImp.prototype.setDataRef = function(refName, via) {
  this.dataRef = firebase.database().ref(refName);
  console.log("Codraw dataRef via", via, this.dataRef.toString());
};

FirebaseImp.prototype.fingerPrint = function(d) {
  // Simplify data for diffing purposes. For now removing undefined
  // or null values that firebase doesn't handle well.
  var copy = _.cloneDeep(d);
  if (copy.canvas) {
    if (copy.canvas.objects) {
      copy.canvas.objects = _.map(copy.canvas.objects, function(obj) {
        return _.omitBy(obj, function(value) {
          if (value === null) { return true; }
          if (value === undefined) { return true; }
          if (_.isArray(value) && value.length < 1) { return true;}
        });
      });
    }
    else {
      copy.canvas.objects = []
    }
  }
  return copy;
};

FirebaseImp.prototype.createSharedUrl = function () {
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

FirebaseImp.prototype.registerListeners = function() {
  //this.log('registering listeners');
  var ref = this.dataRef;

  // debounce this to avoid rapid updates from firebase
  var setData = _.debounce(function(data){
    // ignore this is if we are writing
    if(this.currentData || this.pendingData) { return; }
    var d = data.val() ? data.val().rawData || {} : {};
    var fingerPrint = this.fingerPrint(d);

    if (this.newRefName) {
      this.swapRefs();
      this.dataRef.once("value", function (newData) {
        // Since newRefName is also used to change over to the possibility already existing shared data
        // only copy over original data ref contents to new data ref contents if new data ref is empty
        if (!newData.val()) {
          // save original data to new ref
          this.update(d);
        }
        else {
          const newD = newData.val().rawData || {};
          this.lastData = this.fingerPrint(newD);
          this.loadCallback(newD);
        }
      }.bind(this));
      this.newRefName = null;
    }

    if(_.isEmpty(d)) { return; }
    var differences = diff(fingerPrint, this.lastData);
    if(differences) {
      this.lastData = fingerPrint;
      this.loadCallback(d);
    }
  }.bind(this), 200);
  ref.on('value', setData);

  // The following methods are here to document other or
  // better ways of syncing records with firebases API:
  // ref.on('child_changed', function(data){ log('child_changed:' + data);});
  // ref.on('child_added', function(data)  { log('child added: ' + data); });
  // ref.on('child_removed', function(data){ log('child removed: ' + data);});
};

FirebaseImp.prototype.endWrite = function() {
  this.lastData = this.currentData;
  this.currentData = null;
  if(this.pendingData) {
    this.update(this.pendingData);
  }
};

FirebaseImp.prototype.update = function(data) {
  if (typeof data == 'string') { data = JSON.parse(data); }
  if(this.currentData) {
    this.pendingData = data;
    return;
  }
  this.pendingData = null;
  if(this.dataRef && this.dataRef.update){
    data = this.fingerPrint(data);
    var differences = diff(data, this.lastData);
    if(differences) {
      this.currentData = data;
      this.dataRef.update({'rawData': this.currentData}, this.endWrite.bind(this));
    }
  }
};

FirebaseImp.prototype.swapRefs = function() {
  //this.log('registering listeners');
  if(this.dataRef) {
    try {
      this.dataRef.off();
    }
    catch(e) {
      //this.log('couldn\'t disable previous data handler');
    }
  }
  this.setDataRef(this.newRefName, "swapRefs");
  this.registerListeners();
  this.rewriteParams();
};


// storeImp  {save, setLoadFunction}
FirebaseImp.prototype.save = function(data) {
  this.update(data);
};

FirebaseImp.prototype.saveFile = function(name, data) {
  var ref = firebase.storage().ref(name);
  return ref.put(data);
};

FirebaseImp.prototype.setLoadFunction = function(_loadCallback) {
  this.loadCallback = _loadCallback;
};

module.exports = FirebaseImp;
window.FirebaseStorage = FirebaseImp;