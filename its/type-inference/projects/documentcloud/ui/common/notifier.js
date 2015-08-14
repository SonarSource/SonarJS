dc.ui.Notifier = Backbone.View.extend({

  id : 'notifier',

  events : {
    'click': 'hide'
  },

  options : {
    position  : 'center center',
    text      : 'ok',
    left      : 0,
    top       : 0,
    duration  : 2000,
    leaveOpen : false,
    mode      : 'warn'
  },

  constructor : function(options) {
    Backbone.View.call(this, options);
    $(document.body).append(this.el);
    _.bindAll(this, 'show', 'hide');
  },

  // Display the notifier with a message, positioned relative to an optional
  // anchor element.
  show : function(options) {
    options = _.extend({}, this.options, options);
    this.setMode(options.mode, 'style');
    $(this.el).html(options.text).fadeIn('fast');
    $(this.el).show();
    if (this.timeout) clearTimeout(this.timeout);
    if (!options.leaveOpen) this.timeout = setTimeout(this.hide, options.duration);
  },

  hide : function(immediate) {
    this.timeout = null;
    immediate === true ? $(this.el).hide() : $(this.el).fadeOut('fast');
  }

});