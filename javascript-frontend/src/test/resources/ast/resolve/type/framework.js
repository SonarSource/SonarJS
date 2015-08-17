var jqueryObject1 = $("div");
var jqueryObject2 = jQuery("div");

var notJqueryObject = $("div").val();

var BackboneClass = Backbone.Model.extend();

var BackboneObject = new BackboneClass();

ChildBackboneClass = BackboneClass.extend();

childBackboneObject = new ChildBackboneClass;
