dc.ui.EditorToolbar = Backbone.View.extend({

  className : 'editor_toolbar interface',

  constructor: function() {
    Backbone.View.apply(this, arguments);
    this.modes = {};
    this.viewer = currentDocument;
    this.imageUrl = this.viewer.schema.document.resources.page.image;
  },

  toggle : function() {
    if (this.modes.open == 'is') {
      this.close();
      this.showSelectedThumbnail();
    } else {
      dc.app.editor.closeAllEditors();
      this.open();
    }
  },
  
  showSelectedThumbnail : function() {
    $('.DV-thumbnail.DV-originallySelected').removeClass('DV-originallySelected').addClass('DV-selected');
  },
  
  hideSelectedThumbnail : function() {
    $('.DV-thumbnail.DV-selected').removeClass('DV-selected').addClass('DV-originallySelected');
  }

});