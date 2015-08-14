dc.ui.Scroll = Backbone.View.extend({

  OVERLAP_MARGIN : 50,

  SPEED: 500,

  className : 'scroll',

  events : {
    'click .scroll_up'    : 'scrollUp',
    'click .scroll_down'  : 'scrollDown',
    'mousewheel'          : '_mouseScroll'
  },

  // Given a div with overflow:hidden, make the div scrollable by inserting
  // "page up" and "page down" divs at the top and bottom.
  constructor : function(el) {
    Backbone.View.call(this);
    this.content    = $(el);
    this.upButton   = this.make('div', {'class' : 'scroll_up'});
    this.downButton = this.make('div', {'class' : 'scroll_down'});
    _.bindAll(this, 'check');
  },

  render : function() {
    this.content.addClass('scroll_content');
    this.content.wrap(this.el);
    this.setElement($(this.content).closest('.scroll')[0]);
    this.content.before(this.upButton);
    this.content.after(this.downButton);
    $(window).resize(this.check);
    return this;
  },

  scrollUp : function() {
    var distance = this.content.innerHeight() - this.OVERLAP_MARGIN;
    var top = this.content[0].scrollTop - distance;
    this.content.animate({scrollTop : top}, this.SPEED, null, _.bind(this.setPosition, this, top));
  },

  scrollDown : function() {
    var distance = this.content.innerHeight() - this.OVERLAP_MARGIN;
    var top = this.content[0].scrollTop + distance;
    this.content.animate({scrollTop : top}, this.SPEED, null, _.bind(this.setPosition, this, top));
  },

  check : function() {
    var over = this.hasOverflow();
    this.setMode(over ? 'is' : 'not', 'active');
    if (!over) this.setMode(null, 'position');
    this.setPosition(this.content[0].scrollTop);
  },

  checkLater : function() {
    _.defer(this.check);
  },

  hasOverflow : function() {
    return this.content.innerHeight() < this.content[0].scrollHeight;
  },

  setPosition : function(scrollTop) {
    var mode = scrollTop <= 0 ? 'top' :
      scrollTop + this.content.innerHeight() >= this.content[0].scrollHeight ? 'bottom' :
      'middle';
    if (this.modes.position == mode) return;
    this.setMode(mode, 'position');
  },

  _mouseScroll : function(e, distance) {
    if (this.modes.active == 'not' ||
       (distance >= 0 && this.modes.position == 'top') ||
       (distance <= 0 && this.modes.position == 'bottom')) return;
    var top = this.content[0].scrollTop - distance;
    this.content[0].scrollTop = top;
    this.setPosition(top);
    return false;
  }

});