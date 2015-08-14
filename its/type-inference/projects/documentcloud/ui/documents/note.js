// A tile view for a document's annotations, listed per-document. Allows
// note editing by those who have permission.
dc.ui.Note = Backbone.View.extend({

  className : 'note noselect',

  events : {
    'click .title_link':       'viewNoteInDocument',
    'click .edit_note':        'editNote',
    'click .cancel_note':      'cancelNote',
    'click .save_note':        'saveNote',
    'click .save_draft_note':  'saveNote',
    'click .delete_note':      'deleteNote'
  },

  // Re-render the note when saved.
  initialize : function(options) {
    this.options = options;
    _.bindAll(this, 'render');
    this.model.bind('change', this.render);
  },

  // Renders the note, adding classes that show editing controls if allowed.
  render : function() {
    var data = _.extend(this.model.toJSON(), {
      note          : this.model,
      ownsNote      : true,
      disableLinks  : this.options.disableLinks || false
    });
    $(this.el).html(JST['document/note'](data));
    this.setMode('display', 'visible');
    this.setMode(this.model.get('access'), 'access');
    this.setMode(this.model.checkAllowedToEdit() ? 'is' : 'not', 'editable');
    return this;
  },

  // If the viewport is narrower than the note, center the note.
  center : function() {
    var $excerpt       = this.$('.note_excerpt');
    var coords         = this.model.coordinates();
    if (!coords) return;
    var annoCenter     = coords.left + (coords.width / 2);
    var viewportWidth  = $excerpt.closest('.note_excerpt_wrap').width();
    var viewportCenter = viewportWidth / 2;

    if (coords.left + coords.width > viewportWidth) {
      if (coords.width > viewportWidth) {
        $excerpt.css('left', -1 * coords.left);
      } else {
        $excerpt.css('left', viewportCenter - annoCenter);
      }
    }
  },

  // Opens the note in a document in a new window.
  viewNoteInDocument : function() {
    var suffix = '#document/p' + this.model.get('page') + '/a' + this.model.get('id');
    window.open(this.model.document().viewerUrl() + suffix);
  },

  // Checks permissions and turns on note editing.
  editNote : function() {
    if (!this.model.checkAllowedToEdit()) {
      return dc.ui.Dialog.alert("You don't have permission to edit this note.");
    }
    this.$('.note_title_input').val(this.model.get('title'));
    this.$('.note_text_edit').val(this.model.get('content'));
    this.setMode('edit', 'visible');
  },

  // Simply turns off note editing.
  cancelNote : function() {
    this.setMode('display', 'visible');
  },

  // Sends a server request by saving the note model on the document. Also sets up
  // the correct access level based on which submit button was pressed.
  // The user cna only edit existing notes, not save new notes, hence no
  // need to update note counts on the parent document.
  saveNote : function(e) {
    var access = this.model.get('access');
    if ($(e.target).hasClass('save_draft_note')) {
      access = 'exclusive';
    } else if (this.model.get('access') == 'exclusive') {
      access = 'public';
    }
    this.model.save({
      title   : this.$('.note_title_input').val(),
      content : this.$('.note_text_edit').val(),
      access  : access
    });
    this.render();
  },

  // Sends a server request destroying the note model on the document. Also updates
  // the document model with [assumed] correct number of notes.
  deleteNote : function() {
    dc.ui.Dialog.confirm('Are you sure you want to delete this note?', _.bind(function() {
      this.model.destroy({success : _.bind(function() {
        $(this.el).remove();
        this.model.document().decrementNotes();
      }, this)});
      return true;
    }, this));
  }

});
