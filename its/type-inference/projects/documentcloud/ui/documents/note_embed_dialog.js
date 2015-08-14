dc.ui.NoteEmbedDialog = dc.ui.Dialog.extend({

  events : {
    'change select'         : 'update',
    'click select'          : 'update',
    'click .next'           : 'nextStep',
    'click .previous'       : 'previousStep',
    'click .close'          : 'close',
    'click .snippet'        : 'selectSnippet',
    'click .set_publish_at' : 'openPublishAtDialog',
    'click .edit_access'    : 'editAccessLevel',
    'click .remove_lines'   : 'removeLines'
  },

  totalSteps : 2,

  STEPS : [null,
    _.t('embed_note_step_one'),
    _.t('embed_note_step_two')
  ],

  DEMO_ERROR : _.t('embed_note_demo_error','<a href="/contact">','</a>','<a href="/help/publishing#step_5">','</a>'),

  DEFAULT_OPTIONS : {},

  constructor : function(doc, initialNoteId) {
    this.currentStep   = 1;
    this.doc           = doc;
    this.initialNoteId = initialNoteId;
    this.height        = 0;
    dc.ui.Dialog.call(this, {mode : 'custom', title : this.displayTitle()});
    dc.ui.spinner.show();
    this.fetchNotes();
  },

  fetchNotes : function() {
    this.doc.notes.fetch({
      silent  : true,
      success : _.bind(function() {
        dc.ui.spinner.hide();
        this.render();
      }, this)
    });
  },

  render : function() {
    if (dc.account.organization().get('demo')) return dc.ui.Dialog.alert(this.DEMO_ERROR);
    dc.ui.Dialog.prototype.render.call(this);
    this.$('.custom').html(JST['workspace/note_embed_dialog']({
      doc           : this.doc,
      notes         : this.doc.notes.select(function(note) { return note.get('access') == 'public'; }),
      initialNoteId : this.initialNoteId
    }));
    this._next          = this.$('.next');
    this._previous      = this.$('.previous');
    this._noteSelectEl  = this.$('select[name=note]');
    this._preview       = this.$('.note_preview');
    this.setMode('embed', 'dialog');
    this.setMode('note_embed', 'dialog');
    this.update();
    this.setStep();
    this.center();
    dc.ui.spinner.hide();
    return this;
  },

  displayTitle : function() {
    return this.STEPS[this.currentStep];
  },

  update : function() {
    var id = parseInt(this._noteSelectEl.val(), 10);
    this.note = this.doc.notes.get(id);
    this._renderNote();
    this._renderEmbedCode();
    if (this._preview.height() > this.height) {
      this.center();
      this.height = this._preview.height();
    }
  },

  // Remove line breaks from the viewer embed.
  removeLines : function() {
    var $html_snippet = this.$('#note_embed_html_snippet');
    $html_snippet.val($html_snippet.val().replace(/[\r\n]/g, ''));
  },

  _renderNote : function() {
    var noteView = new dc.ui.Note({
      model         : this.note,
      collection    : this.doc.notes,
      disableLinks  : true
    });
    this.$('.note_preview').html(noteView.render().el);
    noteView.center();
  },

  embedOptions : function() {
    var options = {};
    return options;
  },

  _renderEmbedCode : function() {
    var options          = this.embedOptions();
    this.$('.publish_embed_code').html(JST['workspace/note_embed_code']({
      note    : this.note,
      options : _.map(options, function(value, key){ return key + ': ' + value; }).join(',\n    '),
      shortcodeOptions: options ? ' ' + _.map(options, function(value, key) { return key + '=' + (typeof value == 'string' ? value.replace(/\"/g, '&quot;') : value); }).join(' ') : '',
    }));
  },

  nextStep : function() {
    this.currentStep += 1;
    if (this.currentStep > this.totalSteps) return this.close();
    if (this.currentStep == 2) this.update();
    this.setStep();
  },

  previousStep : function() {
    if (this.currentStep > 1) this.currentStep -= 1;
    this.setStep();
  },

  setStep : function() {
    this.title(this.displayTitle());

    this.$('.publish_step').setMode('not', 'enabled');
    this.$('.publish_step_'+this.currentStep).setMode('is', 'enabled');
    this.info( _.t('step_x_of_x', this.currentStep, this.totalSteps), true);

    var first = this.currentStep == 1;
    var last = this.currentStep == this.totalSteps;

    this._previous.setMode(first ? 'not' : 'is', 'enabled');
    this._next.html(last ? _.t('finish') : _.t('next') + ' &raquo;').setMode('is', 'enabled');
  },

  selectSnippet : function(e) {
    this.$(e.target).closest('.snippet').select();
  },

  // If necessary, let the user change the document's access level before embedding.
  editAccessLevel : function() {
    this.close();
    Documents.editAccess([this.doc]);
  },

  // Optionally, set a document `publish_at` time by opening a new dialog.
  openPublishAtDialog : function() {
    this.close();
    new dc.ui.PublicationDateDialog([this.doc]);
  }

});
