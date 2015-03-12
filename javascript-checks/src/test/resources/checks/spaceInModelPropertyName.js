MyModel = Backbone.Model.extend({
  defaults: {
    'spaced name 1': x,   // NOK
    "spaced name 2": x,   // NOK
    'nonSpacedName': x    // OK
  }
});

MyModel = Backbone.Model.extend({
  initialize : function (){}
});

MyModel = Backbone.Model.extend({});

MyModel = Backbone.Model.extend(1);

MyModel = Backbone.Model.extend();
