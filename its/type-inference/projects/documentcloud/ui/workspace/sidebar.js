// The Sidebar. Switches contexts between different subviews.
dc.ui.Sidebar = Backbone.View.extend({

  id : 'sidebar',

  render : function() {
    $(this.el).html(JST['workspace/sidebar']({}));
    this.content  = this.$('#sidebar_content');
    dc.app.scroller = (new dc.ui.Scroll(this.content)).render();
    return this;
  },

  add : function(containerName, view) {
    this.$('#' + containerName + '_container').append(view);
  }

});