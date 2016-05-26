MyModel1 = Backbone.Model.extend({
  defaults: {
    'spaced name 1': x,   // Noncompliant {{Rename this property to remove the spaces.}}
//  ^^^^^^^^^^^^^^^
    "spaced name 2": x,   // Noncompliant
    'nonSpacedName': x    // OK
  }
});

MyModel2 = Backbone.Model.extend({
  initialize : function (){}
});

MyModel3 = Backbone.Model.extend({});

MyModel4 = Backbone.Model.extend(1);

MyModel5 = Backbone.Model.extend();

var myObject = new MyModel1();

myObject.set("my property", value)  // Noncompliant

myObject.set({
  'my prop' : 1,    // Noncompliant
  'my_prop' : 2     // OK
})
