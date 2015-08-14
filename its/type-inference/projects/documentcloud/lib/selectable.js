// Mixin for collections which should be made selectable.
dc.model.Selectable = {

  firstSelection : null,

  selectedCount : 0,

  selectAll : function() {
    this.each(function(m){ m.set({selected : true}); });
  },

  deselectAll : function() {
    this.each(function(m){ m.set({selected : false}); });
  },

  selected : function() {
    return this.select(function(m){ return m.get('selected'); });
  },

  firstSelected : function() {
    return this.detect(function(m){ return m.get('selected'); });
  },

  selectedIds : function() {
    return _.pluck(this.selected(), 'id');
  },

  _resetSelection : function() {
    this.firstSelection = null;
    this.selectedCount = 0;
  },

  _add : function(model, options) {
    var attrs = model.attributes || model;
    if (attrs.selected == null) attrs.selected = false;
    model = Backbone.Collection.prototype._add.call(this, model, options);
    if (model.get('selected')) this.selectedCount += 1;
  },

  _remove : function(model, options) {
    model = Backbone.Collection.prototype._remove.call(this, model, options);
    if (this.selectedCount > 0 && model.get('selected')) this.selectedCount -= 1;
  },

  // We override "_onModelEvent" to fire selection changed events when models
  // change their selected state.
  _onModelEvent : function(ev, model, error) {
    Backbone.Collection.prototype._onModelEvent.call(this, ev, model, error);
    if (ev != 'change') return;
    if (model.hasChanged('selected')) {
      var selected = model.get('selected');
      if (selected && this.selectedCount == 0) {
        this.firstSelection = model;
      } else if (!selected && this.firstSelection == model) {
        this.firstSelection = null;
      }
      this.selectedCount += selected ? 1 : -1;
      _.defer(_(this.trigger).bind(this, 'select', this));
    }
  }

};