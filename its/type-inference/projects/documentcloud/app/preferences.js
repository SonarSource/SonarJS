// Read and write preferences for the browser, using a cookie.
dc.app.cookies = {

  // Read a cookie by name.
  get : function(name) {
    var matcher = new RegExp("\\s*" + name + "=(.*)$");
    var list    = document.cookie.split(';');
    var cookie  = _.detect(list, function(c) { return c.match(matcher); });
    return cookie ? decodeURIComponent(cookie.match(matcher)[1]) : null;
  },

  // Write a cookie's value, and keep it only for the session (default), or
  // forever (2 years).
  set : function(name, value, keep) {
    var expiration = keep ? new Date() : null;
    if (expiration) keep == 'remove' ? expiration.setYear(expiration.getFullYear() - 1) :
                                       expiration.setYear(expiration.getFullYear() + 2);
    var date = expiration ? '; expires=' + expiration.toUTCString() : '';
    document.cookie = name + '=' + encodeURIComponent(value) + '; path=/' + date;
  },

  // Remove a cookie.
  remove : function(name) {
    this.set(name, this.get(name), 'remove');
  }

};

dc.app.preferences = {

  get : function(name, valid) {
    var value = this._prefs()[name];
    return (!value || (valid && !_.include(valid, value))) ? null : value;
  },

  set : function(obj) {
    this._setPrefs(_.extend(this._prefs(), obj));
  },

  remove : function(name) {
    var prefs = this._prefs();
    delete prefs[name];
    this._setPrefs(prefs);
  },

  _prefs : function() {
    return JSON.parse(dc.app.cookies.get('document_cloud_preferences') || '{}');
  },

  _setPrefs : function(obj) {
    dc.app.cookies.set('document_cloud_preferences', JSON.stringify(obj), true);
  }

};