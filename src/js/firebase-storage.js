/* global firebase require module */
var queryString = require('query-string');
var _ = require('lodash');
var uuid = require('uuid');
var diff = require('deep-diff').default.diff;

function FirebaseImp() {
  this.user = null;
  this.token = null;
  var params = queryString.parse(location.search);
  this.refName = params.firebaseKey || 'default';
  this.newRefName = params.makeCopy ? uuid.v1() : params.newKey || null;
  this.lastData = {};
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
  params.firebaseKey = this.newRefName;
  delete params.newKey;
  delete params.makeCopy;
  var stringifiedParams = queryString.stringify(params);
  location.search = stringifiedParams;
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
  this.dataRef = firebase.database().ref(this.refName);
  this.registerListeners();
  this.log('logged in');
};

FirebaseImp.prototype.fingerPrint = function(d) {
  // Simplify data for diffing purposes. For now removing undefined
  // or null values that firebase doesn't handle well.
  var copy = _.cloneDeep(d);
  copy.canvas.objects = _.map(copy.canvas.objects, function(obj) {
    return _.omitBy(obj, function(value) {
      return value === null || value === undefined;
    });
  });
  return copy;
};

FirebaseImp.prototype.registerListeners = function() {
  this.log('registering listeners');
  var ref = this.dataRef;
  var setData = this.loadCallback;
  var log = this.log.bind(this);
  ref.on('value', function(data){
    var d = data.val() ? data.val().rawData || {} : {};
    var fingerPrint = this.fingerPrint(d);

    if(this.newRefName) {
      this.swapRefs();
      this.update(d);
    }

    if(_.isEmpty(d)) { return; }
    log('new data from firebase');

    var differences = diff(fingerPrint, this.lastData);
    if(differences) {
      this.lastData = fingerPrint;
      setData(d);
    }
  }.bind(this));

  // The following methods are here to document other or
  // better ways of syncing records with firebases API:
  // ref.on('child_changed', function(data){ log('child_changed:' + data);});
  // ref.on('child_added', function(data)  { log('child added: ' + data); });
  // ref.on('child_removed', function(data){ log('child removed: ' + data);});
};

var update = function(data) {
  var rawData = data;
  if (typeof data == 'string') {
    rawData = JSON.parse(data);
  }
  if(this.dataRef && this.dataRef.update){
    this.lastData = this.fingerPrint(rawData);
    this.dataRef.update({'rawData': this.lastData});
  }
};

// TODO: We shouldn't have to debounce, but in some instances … ?
// FirebaseImp.prototype.update = _.debounce(update, 300, {trailing:false, leading: true});
FirebaseImp.prototype.update = update;

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
window.FirebaseStorage =FirebaseImp;