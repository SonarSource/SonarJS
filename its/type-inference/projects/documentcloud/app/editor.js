// Main controller for the in-viewer document editor. Orchestrates subviews.
dc.app.editor = new Backbone.View();
_.extend(dc.app.editor, {

  // Initializes the workspace, binding it to <body>.
  initialize : function(docId, options) {
    this.setElement('body');
    this.docId = docId;
    this.options = options;
    _.bindAll(this, 'closeAllEditors', 'confirmStateChange');
    dc.app.hotkeys.initialize();
    this.createSubViews();
    this.renderSubViews();
    currentDocument.api.onChangeState(this.closeAllEditors);
  },

  confirmStateChange : function(continuation) {
    if (this._openDialog) return;
    this._openDialog = dc.ui.Dialog.confirm('You have unsaved changes. Are you sure you want to leave without saving them?', continuation, {onClose : _.bind(function() {
      this._openDialog = null;
    }, this)});
  },

  setSaveState : function(unsaved) {
    this.unsavedChanges = unsaved;
    var confirmation = unsaved ? this.confirmStateChange : null;
    currentDocument.api.setConfirmStateChange(confirmation);
  },

  // Create all of the requisite subviews.
  createSubViews : function() {
    dc.ui.notifier          = new dc.ui.Notifier();
    this.controlPanel       = new dc.ui.ViewerControlPanel();
    this.sectionEditor      = new dc.ui.SectionEditor();
    this.annotationEditor   = new dc.ui.AnnotationEditor();
    this.removePagesEditor  = new dc.ui.RemovePagesEditor({editor : this});
    this.reorderPagesEditor = new dc.ui.ReorderPagesEditor({editor : this});
    this.editPageTextEditor = new dc.ui.EditPageTextEditor({editor : this});
    this.replacePagesEditor = new dc.ui.ReplacePagesEditor({editor : this});
  },

  // Render all of the existing subviews and place them in the DOM.
  renderSubViews : function() {
    var access = 'DV-isContributor';
    if (this.options.isReviewer) access = 'DV-isReviewer';
    if (this.options.isOwner) access = 'DV-isOwner';
    $('.DV-docViewer').addClass(access);
    $('.DV-well').append(this.controlPanel.render().el);
    $('.DV-logo').hide();
    $('.DV-thumbnailsView').show();
    currentDocument.api.roundTabCorners();
    var supp = $('.DV-supplemental');
    if (supp.hasClass('DV-noNavigation')) {
      supp.removeClass('DV-noNavigation').addClass('DV-noNavigationMargin');
    }
  },

  closeAllEditors : function() {
    this.removePagesEditor.close();
    this.reorderPagesEditor.close();
    this.replacePagesEditor.close();
    this.editPageTextEditor.close();
    return true;
  }

});