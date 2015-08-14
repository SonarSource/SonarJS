// Dialog for embedding a document viewer on a third-party site. Checks the
// access level, presents [saved] preferences, fetches the document embed code.
dc.ui.DocumentEmbedDialog = dc.ui.Dialog.extend({

  events : {
    'click .preview'        : 'preview',
    'change select'         : 'update',
    'click select'          : 'update',
    'keyup input'           : 'update',
    'focus input'           : 'update',
    'click input'           : 'update',
    'change input'          : 'update',
    'change .viewer_open_to': '_renderOpenTo',
    'click .next'           : 'nextStep',
    'click .previous'       : 'previousStep',
    'click .close'          : 'close',
    'click .snippet'        : 'selectSnippet',
    'click .set_publish_at' : 'openPublishAtDialog',
    'click .edit_access'    : 'editAccessLevel',
    'click .remove_lines'   : 'removeLines'
  },

  totalSteps : 3,

  // Off by 1 to maintain sanity. Additionally, the first step is always custom.
  STEPS : [null, null,
           _.t('embed_step_two_title'),
           _.t('embed_step_three_title')
  ],

  DEMO_ERROR : _.t('demo_embed_error', '<a href="/contact">','</a>', '<a href="/help/publishing">','</a>'),

  DEFAULT_OPTIONS : {
    width   : null,
    height  : null,
    sidebar : true,
    text    : true
  },

  // Can't have an embed dialog without a document.
  constructor : function(doc) {
    this.model = doc;
    this.currentStep = 1;
    dc.ui.Dialog.call(this, {mode : 'custom', title : this.displayTitle()});
    this.render();
  },

  // Sets up all jQuery selectors and shows the first step of the embedding process.
  render : function() {
    if (dc.account.organization().get('demo')) return dc.ui.Dialog.alert(this.DEMO_ERROR);
    dc.ui.Dialog.prototype.render.call(this);
    this.$('.custom').html(JST['workspace/document_embed_dialog']({doc: this.model}));
    this._next          = this.$('.next');
    this._previous      = this.$('.previous');
    this._widthEl       = this.$('input[name=width]');
    this._heightEl      = this.$('input[name=height]');
    this._viewerSizeEl  = this.$('select[name=viewer_size]');
    this._sidebarEl     = this.$('input[name=sidebar]');
    this._showTextEl    = this.$('input[name=show_text]');
    this._showPDFEl     = this.$('input[name=show_pdf]');
    this._openToEl      = this.$('.open_to');
    if (dc.app.preferences.get('document_embed_options')) this._loadPreferences();
    this.setMode('document_embed', 'dialog');
    this.update();
    this.setStep();
    this.center();
    return this;
  },

  // The first step is always custom for the document.
  displayTitle : function() {
    if (this.currentStep == 1) return _.t("embed_step_one_title", dc.inflector.truncate(this.model.get('title'), 25) );
    return this.STEPS[this.currentStep];
  },

  // Opens the document embed preview (with options) in a new window using a generated URL.
  preview : function() {
    var options = encodeURIComponent(JSON.stringify(this.embedOptions()));
    var url = '/documents/' + this.model.canonicalId() + '/preview?options=' + options;
    window.open(url);
    return false;
  },

  // Called after every keystroke and input change. Used to save selected options
  // and modify any options that need modifying.
  update : function() {
    this._toggleDimensions();
    this._savePreferences();
  },

  // Returns an object literal with all of the embed options serialized.
  embedOptions : function() {
    var options = {};
    var openToPage = this.$('.page_select').val();
    var openToNote = this.$('.note_select').val();
    if (this._viewerSizeEl.val() == 'fixed') {
      var width   = parseInt(this._widthEl.val(), 10);
      var height  = parseInt(this._heightEl.val(), 10);
      if (width)  options.width  = width;
      if (height) options.height = height;
    }
    if (!this._sidebarEl.is(':checked'))  options.sidebar = false;
    if (!this._showTextEl.is(':checked')) options.text    = false;
    if (!this._showPDFEl.is(':checked'))  options.pdf     = false;
    if (openToPage) options.page = parseInt(openToPage, 10);
    if (openToNote) {
      var note = this.model.notes.get(parseInt(openToNote, 10));
      options.page = note.get('page');
      options.note = note.id;
    }
    return options;
  },

  // If necessary, let the user change the document's access level before embedding.
  editAccessLevel : function() {
    this.close();
    Documents.editAccess([this.model]);
  },

  // Optionally, set a document `publish_at` time by opening a new dialog.
  openPublishAtDialog : function() {
    this.close();
    new dc.ui.PublicationDateDialog([this.model]);
  },

  // Remove line breaks from the viewer embed.
  removeLines : function() {
    var $html_snippet = this.$('#document_embed_html_snippet');
    $html_snippet.val($html_snippet.val().replace(/[\r\n]/g, ''));
  },

  // Serialize and stringify embed options so they remain consistent between embeds.
  _savePreferences : function() {
    dc.app.preferences.set({document_embed_options : JSON.stringify(this.embedOptions())});
  },

  // Read serialized embed options from user's cookie so embed options remain consistent
  // between embeds. *Nifty.*
  _loadPreferences : function() {
    var options = JSON.parse(dc.app.preferences.get('document_embed_options')) || this.DEFAULT_OPTIONS;
    if (options.width || options.height) this._viewerSizeEl.val('fixed');
    this._widthEl.val(options.width);
    this._heightEl.val(options.height);
    this._showPDFEl.attr('checked', options.pdf );
    this._sidebarEl.attr('checked', options.sidebar);
    this._showTextEl.attr('checked', options.text);
  },

  // Handles user selection of dropdown that controls which page/annotation
  // the viewer opens on. Changes form, which is later serialized.
  _renderOpenTo : function(e) {
    switch ($(e.currentTarget).val()) {
      case 'first_page':
        return this._openToEl.empty();
      case 'page':
        return this._openToEl.html(JST['document/page_select']({doc : this.model}));
      case 'note':
        this.model.ignoreNotes = true;
        this.model.notes.fetch({success : _.bind(function() {
          this._openToEl.html(JST['document/note_select']({doc : this.model}));
          delete this.model.ignoreNotes;
        }, this)});
    }
  },

  // Collects embed options and renders them using a JST template in a textarea.
  _renderEmbedCode : function() {
    var options              = this.embedOptions();
    options.container        = '"#DV-viewer-' + this.model.canonicalId() + '"';
    this.$('.publish_embed_code').html(JST['document/embed_code']({
      doc: this.model,
      options: _.map(options, function(value, key){ return key + ': ' + value; }).join(',\n    '),
      shortcodeOptions: _.map(options, function(value, key) { return key + '=' + (typeof value == 'string' ? value.replace(/\"/g, '&quot;') : value); }).join(' '),
      rawOptions: options,
    }));
  },

  // After every keystroke or input change, check if the viewer size has been set.
  _toggleDimensions : function() {
    this.$('.dimensions').toggle(this._viewerSizeEl.val() == 'fixed');
  },

  // On step 1, if a user changes any document attributes, save them and only
  // continue to step 2 if there are no model errors.
  saveUpdatedAttributes : function() {
    var access = this.$('input[name=access_level]').is(':checked') ?
                 dc.access.PUBLIC : this.model.get('access');
    var relatedArticle = this.$('input[name=related_article]').removeClass('error').val();
    var attrs = {
      access          : access,
      related_article : dc.inflector.normalizeUrl(relatedArticle)
    };
    if (attrs = this.model.changedAttributes(attrs)) {
      var errors = _.any(['related_article'], _.bind(function(attr) {
        if (attrs[attr] && !this.validateUrl(attrs[attr])) {
          this.$('input[name=' + attr + ']').addClass('error');
          return true;
        }
      }, this));
      if (errors) return false;
      dc.ui.spinner.show();
      this.model.save(attrs, {success : function(){ dc.ui.spinner.hide(); }});
    }
    return true;
  },

  // Advances to the next step, checking if any errors are returned beforehand from
  // steps that have server-side side-effects.
  nextStep : function() {
    if (this.currentStep == 1 && !this.saveUpdatedAttributes()) return false;
    if (this.currentStep >= this.totalSteps) return this.close();
    if (this.currentStep == 2) this._renderEmbedCode();
    this.currentStep += 1;
    this.setStep();
  },

  // Simply goes backwards.
  previousStep : function() {
    if (this.currentStep > 1) this.currentStep -= 1;
    this.setStep();
  },

  // Regardless of direction, switches the template to only show the active step.
  // Also updates buttons, titles, and step information.
  setStep : function() {
    this.title(this.displayTitle());

    this.$('.publish_step').setMode('not', 'enabled');
    this.$('.publish_step_'+this.currentStep).setMode('is', 'enabled');
    this.info( _.t('step_x_of_x', this.currentStep, this.totalSteps), true);

    var first = this.currentStep == 1;
    var last = this.currentStep == this.totalSteps;

    this._previous.setMode(first ? 'not' : 'is', 'enabled');
    this._next.html(last ? _.t('finish') : _.t('next')+' &raquo;').setMode('is', 'enabled');
  },

  // Auto-selects the embed code when user clicks on the textarea.
  selectSnippet : function(e) {
    this.$(e.target).closest('.snippet').select();
  }

});
