// RESTful sets must specify a 'resource'.
// create   => POST     /resource
// destroy  => DELETE   /resource/id
// update   => PUT      /resource/id
// populate => GET      /resource
dc.model.RESTfulSet = dc.Set.extend({

  populated : false,

  constructor : function() {
    if (!this.resource) throw new Error('dc.model.RESTfulSet: Unspecified resource');
    this.base();
  },

  // Create a model on the server and add it to the set.
  // When the server returns a JSON representation of the model, we update it
  // on the client.
  create : function(model, attributes, options) {
    options = options || {};
    if (attributes) model.set(attributes);
    if (!this.include(model)) this.add(model);
    $.ajax({
      url       : '/' + this.resource,
      type      : 'POST',
      data      : {json : JSON.stringify(model.attributes())},
      dataType  : 'json',
      success   : _.bind(this._handleSuccess, this, model, options.success),
      error     : _.bind(this._handleError, this, model, options.error, null)
    });
  },

  // Destroy a model on the server and remove it from the set.
  destroy : function(model, options) {
    options = options || {};
    this.remove(model);
    $.ajax({
      url       : '/' + this.resource + '/' + model.id,
      type      : 'POST',
      data      : {_method : 'delete'},
      dataType  : 'json',
      success   : function(resp) { if (options.success) options.success(model, resp); },
      error     : _.bind(function(resp) {
        this.add(model);
        this._handleError(model, options.error, null, resp);
      }, this)
    });
  },

  // Update a model on the server and (optionally) the client.
  // Pass only a model to persist its current attributes to the server.
  update : function(model, attributes, options) {
    options = options || {};
    var previous = attributes ? model.attributes() : null;
    if (attributes) model.set(attributes);
    $.ajax({
      url       : '/' + this.resource + '/' + model.id,
      type      : 'POST',
      data      : {json : JSON.stringify(model.attributes()), _method : 'put'},
      dataType  : 'json',
      success   : _.bind(this._handleSuccess, this, model, options.success),
      error     : _.bind(this._handleError, this, model, options.error, previous)
    });
  },

  // Initialize the client-side set of models with its default contents.
  // Pass in the array of models in order to populate directly.
  populate : function(options) {
    options = options || {};
    var me = this;
    var onSuccess = function(resp) {
      var models = _.map(resp[me.resource] || resp, function(attrs) {
        return new me.model(attrs);
      });
      me.refresh(models);
      if (options.success) options.success();
    };
    this.populated = true;
    if (_.isArray(options)) return onSuccess(options);
    $.ajax({
      url       : '/' + this.resource,
      type      : 'GET',
      dataType  : 'json',
      success   : onSuccess,
      error     : function(req, textStatus, errorThrown) {
        if (req.status == 403) {
          Accounts.forceLogout();
        }
      }
    });
  },

  _handleSuccess : function(model, callback, resp) {
    if (callback) return callback(model, resp);
    model.set(resp);
  },

  _handleError : function(model, callback, previous, resp) {
    var json = JSON.parse(resp.responseText);
    if (callback) return callback(model, json);
    if (previous) model.set(previous);
    dc.ui.notifier.show({text : json.errors[0]});
  }

});