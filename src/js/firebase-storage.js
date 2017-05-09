/* global firebase require module */
var queryString = require('query-string');

function FirebaseImp(params) {
  this.user = null;
  this.token = null;
  this.refName = params.firebaseKey;
  this.newRefName = params.newKey;
  this.config = {
    apiKey: 'AIzaSyDUm2l464Cw7IVtBef4o55key6sp5JYgDk',
    authDomain: 'colabdraw.firebaseapp.com',
    databaseURL: 'https://colabdraw.firebaseio.com',
    storageBucket: 'colabdraw.appspot.com',
    messagingSenderId: '432582594397'
  };
  this.initFirebase();
}

FirebaseImp.prototype.log = function(mesg) {
  console.log(mesg);
};

FirebaseImp.prototype.error = function(error) {
  console.error(error);
};

FirebaseImp.prototype.rewriteParams = function() {
  var params = queryString.parse(location.search);
  params.firebaseKey = params.newKey;
  delete params.newKey;
  var stringifiedParams = queryString.stringify(params);
  location.search = stringifiedParams;
};

FirebaseImp.prototype.reqAuth = function() {
  var provider = new firebase.auth.GoogleAuthProvider();
  firebase.auth().signInWithRedirect  (provider)
  .then(this.finishAuth.bind(this))
  .catch(this.failAuth.bind(this));
};

FirebaseImp.prototype.failAuth = function(error) {
  var errorMessage = error.message;
  const email = error.email;
  this.error(['could not authenticate', errorMessage, email].join(' '));
};

FirebaseImp.prototype.finishAuth = function(result) {
  this.user = result.user;
  this.dataRef = firebase.database().ref(this.refName);
  this.registerListeners();
  this.log('logged in');
};

FirebaseImp.prototype.registerListeners = function() {
  this.log('registering listeners');
  var ref = this.dataRef;
  var setData = this.loadCallback;
  var log = this.log.bind(this);
  ref.on('value', function(data){
    var d = data.val().rawData;
    setData(d || {});
    if(this.newRefName && d) {
      this.swapRefs();
      this.update(d);
    }
  }.bind(this));

  // The following methods are here to document other or
  // better ways of syncing records with firebases API:
  ref.on('child_changed', function(data){ log('child_changed:' + data);});
  ref.on('child_added', function(data)  { log('child added: ' + data); });
  ref.on('child_removed', function(data){ log('child removed: ' + data);});
};

FirebaseImp.prototype.update = function(data) {
  var rawData = JSON.parse(data);
  if(this.dataRef && this.dataRef.update){
    this.dataRef.update({'rawData': rawData});
  }
};

FirebaseImp.prototype.swapRefs = function() {
  this.log('registering listeners');
  if(this.dataRef) {
    try {
      this.dataRef.off();
    }
    catch(e) {
      this.log('couldn\'t disable previous data handler');
    }
  }
  this.dataRef = firebase.database().ref(this.newRefName);
  // This is the copy operation:
  if(this.lastData) {
    this.update(this.lastData);
  }
  this.registerListeners();
  this.rewriteParams();
};


FirebaseImp.prototype.initFirebase = function() {
  firebase.initializeApp(this.config);
  var finishAuth = this.finishAuth.bind(this);
  var reqAuth    = this.reqAuth.bind(this);
  var log        = this.log.bind(this);
  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      log(user.displayName + ' authenticated');
      finishAuth({result: {user: user}});
    } else {
      reqAuth();
    }
  });
};

// storeImp  {save, setLoadFunction}
FirebaseImp.prototype.save = function(data) {
  this.update(data);
};

FirebaseImp.prototype.setLoadFunction = function(_loadCallback) {
  this.loadCallback = _loadCallback;
};

module.exports = FirebaseImp;