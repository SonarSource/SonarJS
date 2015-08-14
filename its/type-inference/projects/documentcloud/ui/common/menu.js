dc.ui.Menu = Backbone.View.extend({

  className : 'minibutton menu',

  options : {id : null, standalone : false},

  events : {
    'click'        : 'open',
    'selectstart'  : '_stopSelect'
  },
  
  initialize: function(options) {
    this.options = options;
  },

  constructor : function(options) {
    this.modes = {};
    _.bindAll(this, 'close');
    Backbone.View.call(this, _.extend({}, this.options, options));
    this.items          = [];
    // an Update to jQuery removed direct element creation requiring this code:
    //    this.content        = $(JST['common/menu'](this.options));
    //    this.itemsContainer = $('.menu_items', this.content);
    //    this.addIcon        = $('.bullet_add', this.content);
    // to be replaced with the following code.  It should be refactored & cleaned up
    // in order to simplify the manner in which menus are injected onto the page.
    var classNames = "menu_content interface " + (this.options.standalone ? 'standalone' : 'attached');
    var mid = this.options.id ? this.options.id + "_content" : '';
    this.content        = $(this.make("div", {'class': classNames, id: mid }, '<div class="menu_items"></div>'));
    this.itemsContainer = this.content.find('.menu_items');
    this.addIcon        = this.content.find('.bullet_add');
    this.modes.open     = 'not';
    if (options.items) this.addItems(options.items);
  },

  render : function() {
    this.$el.html(JST['common/menubutton']({label : this.options.label}));
    this._label = this.$('.label');
    $(document.body).append(this.content);
    return this;
  },

  open : function() {
    var content = this.content;
    if (this.modes.enabled == 'not') return false;
    if (this.modes.open == 'is' && !this.options.standalone) return this.close();
    this.setMode('is', 'open');
    if (this.options.onOpen) this.options.onOpen(this);
    content.show();
    content.align(this.el, '-left bottom no-constraint');
    content.autohide({onHide : this.close});
    return this;
  },

  close : function(e) {
    if (e && this.options.onClose && !this.options.onClose(e)) return false;
    this.setMode('not', 'open');
    return true;
  },

  enable : function() {
    this.setMode('is', 'enabled');
  },

  disable : function() {
    this.setMode('not', 'enabled');
  },

  // Show the menu button as being currently open, with another click required
  // to close it.
  activate : function(callback) {
    this._activateCallback = callback;
    this.setMode('is', 'active');
  },

  deactivate : function(e) {
    if (this.modes.active == 'is') {
      this.setMode('not', 'active');
      if (this._activateCallback) this._activateCallback();
      return false;
    }
  },

  clear : function() {
    this.items = [];
    $(this.itemsContainer).html('');
    this.content.setMode(null, 'selected');
  },

  setLabel : function(label) {
    $(this._label).text(label || this.options.label);
  },

  addItems : function(items) {
    this.items = this.items.concat(items);
    var elements = _(items).map(_.bind(function(item) {
      var attrs = item.attrs || {};
      _.extend(attrs, {'class' : 'menu_item ' + (attrs['class'] || '')});
      var el = this.make('div', attrs, item.title);
      item.menuEl = $(el);
      if (item.onClick) $(el).bind('click', function(e) {
        if ($(el).hasClass('disabled')) return false;
        item.onClick(e);
      });
      return el;
    }, this));
    $(this.itemsContainer).append(elements);
  },

  select : function(item) {
    this.selectedItem = item;
    item.menuEl.addClass('selected');
  },

  deselect : function() {
    if (this.selectedItem) this.selectedItem.menuEl.removeClass('selected');
    this.selectedItem = null;
  },

  _stopSelect : function(e) {
    return false;
  }

});
