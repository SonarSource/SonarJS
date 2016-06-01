var Sidebar = Backbone.Model.extend({
  promptColor: function() {
  }
});

var sidebar1 = new Sidebar;
var sidebar2 = new Sidebar();
sidebar3 = new Sidebar

sidebar1.changed = { myProperty: 1 } // Noncompliant {{Remove this update of the "changed" property.}}
//       ^^^^^^^
sidebar2.changed = 1 // Noncompliant
sidebar3.changed = someObj // Noncompliant

sidebar1.someProperty = 1   // OK
