dc.ui.SectionEditor = Backbone.View.extend({

  constructor : function(options) {
    Backbone.View.call(this, options);
    _.bindAll(this, 'addRow', 'saveSections', 'removeAllSections');
  },

  open : function() {
    if (this.dialog) return false;
    this.sections = _.sortBy(currentDocument.api.getSections(), function(s){ return parseInt(s.pageNumber, 10); });
    this.dialog = new dc.ui.Dialog({
      title       : _.t('edit_sections'),
      information : _.t('enter_title_and_page'),
      id          : 'section_editor',
      mode        : 'confirm',
      saveText    : _.t('save'),
      onClose     : _.bind(function(){ this.dialog = null; }, this),
      onConfirm   : _.bind(function(){ return this.saveSections(this.serializeSections()); }, this)
    }).render();
    this.sectionsEl = $(this.make('ul', {id : 'section_rows', 'class' : 'not_draggable'}));
    this.removeEl   = $(this.make('div', {'class' : 'minibutton warn remove_all'}, _.t('remove_all') ));
    this.removeEl.bind('click', this.removeAllSections);
    this.dialog.append(this.sectionsEl);
    this.dialog.addControl(this.removeEl);
    this.renderSections();
  },

  saveSections : function(sections) {
    var numbers = _.pluck(sections, 'page_number');
    if (numbers.length > _.uniq(numbers).length) return this.dialog.error( _.t('no_duplicate_section'));
    if (this.impossibleSections(sections)) return this.dialog.error( _.t('no_section_outside_doc') );
    $.ajax({
      url       : '/sections/set',
      type      : 'POST',
      data      : {sections : JSON.stringify(sections), document_id : dc.app.editor.docId},
      dataType  : 'json'
    });
    this.updateNavigation(sections);
    return true;
  },

  removeAllSections : function() {
    this.saveSections([]);
    this.dialog.close();
  },

  impossibleSections : function(sections) {
    var total = currentDocument.api.numberOfPages();
    return _.any(sections, function(sec) {
      return (sec.page_number < 1) || (sec.page_number > total);
    });
  },

  serializeSections : function() {
    var sections = [];
    $('.section_row').each(function(i, row) {
      var title = $('input', row).val();
      var first = parseInt($('.page_number', row).val(), 10);
      if (title) sections.push({title : title, page_number : first, page : first});
    });
    return sections;
  },

  renderSections : function() {
    var me = this;
    if (!_.size(this.sections)) return _.each(_.range(3), function(){ me.addRow(); });
    _.each(this.sections, function(sec) {
      me.addRow({title : sec.title, page_number : sec.page});
    });
  },

  updateNavigation : function(sections) {
    sections = _.map(sections, function(s){ return _.extend({page : s.page_number}, s); });
    currentDocument.api.setSections(sections);
  },

  addRow : function(options) {
    options = _.extend({pageCount : currentDocument.api.numberOfPages(), title : '', page_number : ''}, options);
    var row = $(JST['section_row'](options));
    $('.section_title', row).val(options.title).placeholder();
    $('.minus', row).bind('click', function(){ row.remove(); });
    $('.plus', row).bind('click', _.bind(function(){ this.addRow({after : row}); }, this));
    if (options.after) return options.after.after(row);
    this.sectionsEl.append(row);
  }

});
