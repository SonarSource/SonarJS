// The Help tab.
dc.ui.Help = Backbone.View.extend({

  PAGES : [
    {url : '',                 title : _.t('introduction')},
    {url : 'tour',             title : _.t('guided_tour')},
    {url : 'accounts',         title : _.t('adding_accounts')},
    {url : 'searching',        title : _.t('searching_dd')},
    {url : 'uploading',        title : _.t('uploading_documents')},
    {url : 'troubleshooting',  title : _.t('troubleshooting_uploads')},
    {url : 'modification',     title : _.t('document_modification')},
    {url : 'notes',            title : _.t('editing_notes_sections')},
    {url : 'collaboration',    title : _.t('collaboration')},
    {url : 'privacy',          title : _.t('privacy')},
    {url : 'publishing',       title : _.t('publishing_embedding')},
    {url : 'api',              title : _.t('the_api')}
  ],

  events : {
    'click .contact_us':  'openContactDialog',
    'click .uservoice':   'openUserVoice'
  },

  initialize : function() {
    this.currentPage = null;
    this.PAGE_URLS = _.pluck(this.PAGES, 'url');
  },

  render : function() {
    dc.app.navigation.bind('tab:help',  _.bind(this.openHelpTab, this));
    this._toolbar = $('#help_toolbar');
    if (dc.account) {
      this._toolbar.prepend(this._createHelpMenu().render().el);
    }
    return this;
  },

  openContactDialog : function() {
    dc.ui.Dialog.contact();
  },

  openUserVoice : function() {
    window.open('http://documentcloud.uservoice.com');
  },

  openPage : function(page) {
    var noChange = !_.include(this.PAGE_URLS, page) || (page === this.currentPage);
    this.currentPage = page;
    this.saveHistory();
    if (noChange) return dc.app.navigation.open('help');
    page || (page = dc.account ? 'index' : 'public');
    $.get("/ajax_help/" + page + '.html', function(resp) {
      $('#help_content').html(resp);
    });
    dc.app.navigation.open('help');
  },

  openHelpTab : function() {
    this.currentPage ? this.saveHistory() : this.openPage('');
  },

  saveHistory : function() {
    Backbone.history.navigate('help' + (this.currentPage ? '/' + this.currentPage : ''));
  },

  _createHelpMenu : function() {
    return this.menu = new dc.ui.Menu({
      id      : 'how_to_menu',
      label   : _.t('guides_howtos'),
      items   : _.map(this.PAGES, _.bind(function(page) {
        return {onClick : _.bind(this.openPage, this, page.url), title : page.title};
      }, this))
    });
  }

});
