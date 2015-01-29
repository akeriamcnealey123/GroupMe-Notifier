function show(body) {
  var time = /(..)(:..)/.exec(new Date());     // The prettyprinted time.
  var hour = time[1] % 12 || 12;               // The prettyprinted hour.
  var period = time[1] < 12 ? 'a.m.' : 'p.m.'; // The period of the day.
  if (!body) body = "sample body";
  new Notification(hour + time[2] + ' ' + period, {
    icon: '48.png',
    body: body
  });
}
chrome.storage.sync.get("token", function(items){
  if (items.token){
    setUpSocket(items.token);
  } else {
    openAuthTab();
  }
});
openAuthTab = function(){
  chrome.tabs.create({
    'url': chrome.extension.getURL('index.html')
  }, function(tab) {

  });
};
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.method == "setToken"){
    chrome.storage.sync.set({'token': request.value}, function() {
      sendResponse({data: "Token set"});
    });
  }
});
chrome.storage.onChanged.addListener(function(changes, namespace) {
  for (key in changes) {
    if (key === "token"){
      setUpSocket(changes[key].newValue);
    }
  }
});
getUserInfo = function(token, cb){
  var request = new XMLHttpRequest();
  request.open('GET', 'https://api.groupme.com/v3/users/me?token='+token, true);
  request.onload = function() {
    if (request.status >= 200 && request.status < 400) {
      var resp = request.responseText;
      cb(JSON.parse(resp).response);
    }
  };
  request.send();
};
setUpSocket = function(token){
  getUserInfo(token,function(user){
    subscribe(user.id);
  });
  var client = new Faye.Client('https://push.groupme.com/faye');
  client.addExtension({
    outgoing: function(message, callback){
      message.ext = message.ext || {};
      message.ext.token = token;
      message.ext.timestamp = Date.now()/1000 |0;
      callback(message);
    }
  });
  var subscribe = function(uid){
    var subscription = client.subscribe('/user/'+uid, function(message) {
        show(message);
    });
  };
};
