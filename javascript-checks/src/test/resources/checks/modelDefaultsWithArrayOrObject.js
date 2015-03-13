MyModel = Backbone.Model.extend({
  defaults: {                     // NOK
    a: {},
    b: 1
  }
});

MyModel = Backbone.Model.extend({
  defaults: {                     // NOK
    a: []
  }
});

MyModel = Backbone.Model.extend({
  defaults: function () {         // OK
    return { a: {}, b: 1 };
  }
});

MyModel = Backbone.Model.extend({
  defaults: {                     // OK
    a: 1
  }
});

MyModel = Backbone.Model.extend({
  initialize: function () {
  }
});

