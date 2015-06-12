var Sidebar = Backbone.Model.extend({
  promptColor: function() {
  }
});

var sidebar1 = new Sidebar;
var sidebar2 = new Sidebar();
sidebar3 = new Sidebar

sidebar1.changed = { myProperty: 1 } // NOK
sidebar2.changed = 1 // NOK
sidebar3.changed = someObj // NOK

sidebar1.someProperty = 1   // OK
