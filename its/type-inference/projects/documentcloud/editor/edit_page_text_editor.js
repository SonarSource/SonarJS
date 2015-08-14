dc.ui.EditPageTextEditor = dc.ui.EditorToolbar.extend({

  id : 'edit_page_text_container',

  events : {
    'click .edit_page_text_confirm_input' : 'confirmEditPageText',
    'click .document_page_tile_remove'    : 'resetPage',
    'click .close_editor'                 : 'close'
  },

  initialize : function(opts) {
    this.editor = opts.editor;
    _.bindAll(this, 'cachePageText');
  },

  _resetState : function() {
    this.originalPageText = {};
    this.pageText = {};
  },

  findSelectors : function() {
    this.$s = {
      guide : $('#edit_page_text_guide'),
      guideButton: $('.edit_page_text.button'),
      page : $('.DV-text'),
      pages : $('.DV-pages'),
      viewerContainer : $('.DV-docViewer-Container'),
      header : $('#edit_page_text_container'),
      container : null,
      saveButton : $('.edit_page_text_confirm_input', this.el),
      headerTiles : $('.document_page_tiles', this.el)
    };
  },

  open : function() {
    $(this.el).show();
    this.findSelectors();
    this._resetState();
    this.setMode('is', 'open');
    this.viewer.api.enterEditPageTextMode();
    this.render();
  },

  render : function() {
    $(this.el).html(JST['edit_page_text']({}));
    this.$s.viewerContainer.append(this.el);
    if (this.viewer.state != 'ViewText') {
        this.viewer.open('ViewText');
    }
    this.$s.pages.addClass('edit_page_text_viewer');
    this.$s.container = $(this.el);
    this.findSelectors();
    this.$s.guideButton.addClass('open');
    this.$s.guide.fadeIn('fast');
    this.$s.saveButton.setMode('not', 'enabled');
    this.$s.header.removeClass('active');
    this.handleEvents();
  },

  handleEvents : function() {
    $('.DV-textContents').parent().delegate('.DV-textContents', 'keyup', this.cachePageText).delegate('.DV-textContents', 'change', this.cachePageText);
  },

  getPageNumber : function() {
    return this.viewer.api.currentPage();
  },

  getPageText : function(pageNumber) {
    pageNumber = pageNumber || this.getPageNumber();

    return this.viewer.api.getPageText(pageNumber);
  },

  confirmEditPageText : function() {
    var modifiedPages = this.getChangedPageTextPages();
    var documentId = this.viewer.api.getModelId();
    var dialog = dc.ui.Dialog.progress("Saving text edits&hellip;");

    $.ajax({
      url       : '/documents/' + documentId + '/save_page_text',
      type      : 'POST',
      data      : { modified_pages : JSON.stringify(modifiedPages) },
      dataType  : 'json',
      success   : _.bind(function(resp) {
        try {
          window.opener && window.opener.Documents && window.opener.Documents.get(documentId).set(resp);
        } catch (e) {
          // It's cool.
        }
        window.close();
        dialog.close();
        this.viewer.api.resetPageText(true);
        _.defer(dc.ui.Dialog.alert, "The page text is being saved. Please close this document.");
      }, this)
    });
  },

  setSaveState : function() {
    this.editor.setSaveState(!!_.keys(this.pageText).length);
  },

  cachePageText : function() {
    var pageNumber = this.getPageNumber();
    var pageText = dc.inflector.trim($('.DV-textContents').textWithNewlines());

    if (!(pageNumber in this.originalPageText)) {
      this.originalPageText[pageNumber] = $.trim(this.getPageText(pageNumber));
    }

    if (pageText != this.originalPageText[pageNumber]) {
      if (!(pageNumber in this.pageText)) {
        this.redrawHeader();
      }
      this.pageText[pageNumber] = pageText;
    } else {
      delete this.originalPageText[pageNumber];
      delete this.pageText[pageNumber];
      this.redrawHeader();
    }

    this.setSaveState();
    this.viewer.api.setPageText(pageText, pageNumber);
  },

  resetPage : function(e) {
    var pageNumber = $(e.currentTarget).parents('.document_page_tile').attr('data-pageNumber');

    this.viewer.api.setPageText(this.originalPageText[pageNumber], pageNumber);
    this.viewer.api.enterEditPageTextMode();
    delete this.originalPageText[pageNumber];
    delete this.pageText[pageNumber];
    this.setSaveState();
    this.redrawHeader();
  },

  redrawHeader : function() {
    var saveText;
    var editedPages = _.keys(this.originalPageText);
    var pageCount = editedPages.length;
    editedPages = editedPages.sort(function(a, b) { return a - b; });
    $('.document_page_tile', this.$s.headerTiles).empty().remove();

    if (pageCount == 0) {
      this.$s.header.removeClass('active');
      this.$s.saveButton.setMode('not', 'enabled');
    } else {
      this.$s.header.addClass('active');
      this.$s.saveButton.setMode('is', 'enabled');
    }

    // Create each page tile and add it to the page holder
    _.each(editedPages, _.bind(function(pageNumber) {
      var url = this.imageUrl;
      url = url.replace(/\{size\}/, 'thumbnail');
      url = url.replace(/\{page\}/, pageNumber);
      var $thumbnail = $(JST['document_page_tile']({
        url : url,
        pageNumber : pageNumber
      }));
      $thumbnail.attr('data-pageNumber', pageNumber);
      this.$s.headerTiles.append($thumbnail);
    }, this));

    // Update remove button's text
    if (pageCount == 0) {
      saveText = 'Save page text';
    } else {
      saveText = 'Save ' + pageCount + dc.inflector.pluralize(' page', pageCount);
    }
    $('.edit_page_text_confirm_input', this.el).val(saveText);

    // Set width of container for side-scrolling
    var width = $('.document_page_tile').length * $('.document_page_tile').eq(0).outerWidth(true);
    var confirmWidth = $('.editor_toolbar_controls', this.el).outerWidth(true);
    this.$s.headerTiles.width(width + confirmWidth + 10);
    Backbone.View.prototype.delegateEvents.call(this);
  },

  getChangedPageTextPages : function() {
    var modifiedPages = {};
    _.each(this.pageText, _.bind(function(pageText, pageNumber) {
      if (this.originalPageText[pageNumber] != pageText) {
        modifiedPages[pageNumber] = pageText;
      }
    }, this));

    return modifiedPages;
  },

  close : function() {
    if (this.modes.open == 'is') {
      this._resetState();
      this.setSaveState();
      this.setMode('not', 'open');
      this.$s.guideButton.removeClass('open');
      this.$s.guide.hide();
      this.$s.pages.removeClass('edit_page_text_viewer');
      $('.DV-textContents').attr('contentEditable', false).removeClass('DV-editing');
      $(this.el).hide();
      this.viewer.api.leaveEditPageTextMode();
    }
  }

});