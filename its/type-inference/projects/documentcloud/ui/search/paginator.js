dc.ui.Paginator = Backbone.View.extend({

  DEFAULT_PER_PAGE : 10,
  MINI_PER_PAGE    : 30,

  SORT_TEXT : {
    score       : _.t('by_relevance'),
    title       : _.t('by_title'),
    created_at  : _.t('by_date'),
    source      : _.t('by_source'),
    page_count  : _.t('by_length')
  },

  id        : 'paginator',
  className : 'interface',

  query : null,
  page  : null,
  view  : null,

  events : {
    'click .arrow.left':          'previousPage',
    'click .arrow.right':         'nextPage',
    'click .current_placeholder': 'editPage',
    'change .current_page':       'changePage',
    'click .sorter':              'chooseSort'
  },

  constructor : function(options) {
    Backbone.View.call(this, options);
    this.setSize(dc.app.preferences.get('paginator_mini') || false);
    this.sortOrder = dc.app.preferences.get('sort_order') || 'score';
  },

  setQuery : function(query, view) {
    this.query = query;
    this.page  = query.page;
    $(document.body).addClass('paginated');
    this.render();
  },

  setSortOrder : function(order) {
    this.sortOrder = order;
    dc.app.preferences.set({sort_order : order});
    this.$('.sorter').text(this.SORT_TEXT[this.sortOrder]);
    dc.app.searcher.loadPage();
  },

  queryParams : function() {
    var params = {
      per_page : dc.app.paginator.pageSize(),
      order    : dc.app.paginator.sortOrder
    };
    if (!this.mini) params.mentions = Documents.NUM_MENTIONS;
    return params;
  },

  hide : function() {
    $(document.body).removeClass('paginated');
  },

  // Keep in sync with search.rb on the server.
  pageSize : function() {
    return this.mini ? this.MINI_PER_PAGE : this.DEFAULT_PER_PAGE;
  },

  pageFactor : function() {
    return this.mini ? this.MINI_PER_PAGE / this.DEFAULT_PER_PAGE :
                       this.DEFAULT_PER_PAGE / this.MINI_PER_PAGE;
  },

  pageCount : function() {
    return Math.ceil(this.query.total / this.pageSize());
  },

  render : function() {
    this.setMode('not', 'editing');
    var el = $(this.el);
    el.html('');
    if (!this.query) return this;
    el.html(JST['workspace/paginator']({
      q           : this.query,
      sort_text   : this.SORT_TEXT[this.sortOrder],
      per_page    : this.pageSize(),
      page_count  : this.pageCount()
    }));
    return this;
  },

  setSize : function(mini) {
    this.mini = mini;
    $(document.body).toggleClass('minidocs', this.mini);
  },

  ensureRows : function(callback, doc) {
    if (this.mini) {
      this.toggleSize(callback, doc);
    } else {
      callback();
    }
  },

  toggleSize : function(callback, doc) {
    this.setSize(!this.mini);
    dc.app.preferences.set({paginator_mini : this.mini});
    callback = _.isFunction(callback) ? callback : null;
    var page = Math.floor(((this.page || 1) - 1) / this.pageFactor()) + 1;
    if (doc) page += Math.floor(Documents.indexOf(doc) / this.pageSize());
    dc.app.searcher.loadPage(page, callback);
  },

  chooseSort : function() {
    var dialog = dc.ui.Dialog.choose( _.t('sort_documents_by')+'&hellip;', [
      {text : _.t('relevance'),     value : 'score',      selected : this.sortOrder == 'score'},
      {text : _.t('date_uploaded'), value : 'created_at', selected : this.sortOrder == 'created_at'},
      {text : _.t('title'),         value : 'title',      selected : this.sortOrder == 'title'},
      {text : _.t('source'),        value : 'source',     selected : this.sortOrder == 'source'},
      {text : _.t('length'),        value : 'page_count', selected : this.sortOrder == 'page_count'}
    ], _.bind(function(order) {
      this.setSortOrder(order);
      return true;
    }, this), {mode : 'short_prompt'});
    $(dialog.el).addClass('short_choice');
  },

  editPage : function() {
    this.setMode('is', 'editing');
    this.$('.current_page').focus();
  },

  previousPage : function() {
    var page = (this.page || 1) - 1;
    dc.app.searcher.loadPage(page);
  },

  nextPage : function() {
    var page = (this.page || 1) + 1;
    dc.app.searcher.loadPage(page);
  },

  changePage : function(e) {
    var page = parseInt($(e.target).val(), 10);
    if (page == this.page) return;
    dc.app.searcher.loadPage(page);
  }

});
