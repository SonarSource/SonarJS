dc.ui.Tooltip = Backbone.View.extend({

  id        : 'tooltip',
  className : 'interface',

  OFFSET    : 5,
  MAX_WIDTH : 320,

  options : {
    text  : 'info',
    left  : 0,
    top   : 0
  },

  constructor : function(options) {
    Backbone.View.call(this, options);
    this._open = false;
    _.bindAll(this, 'hide', 'show');
    $(this.el).html(JST['common/tooltip']());
    this._title   = this.$('#tooltip_title');
    this._content = this.$('#tooltip_text');
    $(document.body).append(this.el);
  },

  show : function(options) {
    options       = _.extend(this.options, options);
    options.top  += this.OFFSET;
    this.setMode(options.mode, 'style');
    this._title.html(options.title);
    this._content.html(options.text);
    var outerWidth = $(this.el).outerWidth();
    var limit = $(window).width() - this.OFFSET - outerWidth;
    options.left += options.left < limit ? this.OFFSET : -(outerWidth + 2);
    $(this.el).css({top : options.top, left : options.left});
    if (!this._open) this.fadeIn();
    if (!options.leaveOpen) $(document).bind('mouseover', this.hide);
    this._open = true;
  },

  hide : function(e) {
    if (!this._open) return;
    this._open = false;
    $(document).unbind('mouseover', this.hide);
    this.fadeOut();
  },

  fadeIn : function() {
    $(this.el).stop(true, true).fadeIn('fast');
  },

  fadeOut : function() {
    $(this.el).stop(true, true).fadeOut('fast');
  }

});
