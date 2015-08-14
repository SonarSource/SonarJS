// The main central panel. Switches contexts between different subviews.
dc.ui.Panel = Backbone.View.extend({

  className : 'panel_container',

  initialize : function() {
    _.bindAll(this, '_setMinHeight');
  },

  render : function() {
    $(this.el).html(JST['workspace/panel']({}));
    this.content = this.$('.panel_content');
    $(window).resize(this._setMinHeight);
    _.defer(this._setMinHeight);
    return this;
  },

  add : function(containerName, view) {
    this.$('#' + containerName + '_container').append(view);
  },

  _setMinHeight : function() {
    $(this.el).css({"min-height": $(window).height() - 100});
  }

});