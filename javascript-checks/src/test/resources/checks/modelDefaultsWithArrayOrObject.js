MyModel = Backbone.Model.extend({
  defaults: {                     // Noncompliant {{Make "defaults" a function.}}
//^^^^^^^^
    a: {},
    b: 1
  }
});

MyModel = Backbone.Model.extend({
  defaults: {                     // Noncompliant
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

