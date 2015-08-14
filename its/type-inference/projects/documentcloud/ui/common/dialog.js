dc.ui.Dialog = Backbone.View.extend({

  className : 'dialog',

  options : {
    title       : "Untitled Dialog",
    text        : null,
    information : null,
    description : null,
    choices     : null,
    password    : false,
    editor      : false,
    draggable   : true
  },

  events : {
    'click .cancel'   : 'cancel',
    'click .ok'       : 'confirm',
    'focus input'     : '_addFocus',
    'focus textarea'  : '_addFocus',
    'blur input'      : '_removeFocus',
    'blur textarea'   : '_removeFocus'
  },
  
  initialize: function(options) {
    this.options = _.extend({}, this.options, options);
  },

  render : function(opts) {
    this.modes || (this.modes = {});
    opts = opts || {};
    if (this.options.mode) this.setMode(this.options.mode, 'dialog');
    if (this.options.draggable) this.setMode('is', 'draggable');
    _.bindAll(this, 'close', '_maybeConfirm', '_maybeClose');
    $(this.el).html(JST['common/dialog'](_.extend({}, this.options, opts)));
    var cel = this.contentEl = this.$('.content');
    this._controls = this.$('.controls');
    this._information = this.$('.information');
    if (this.options.width) $(this.el).css({width : this.options.width});
    if (this.options.content) cel.val(this.options.content);
    $(document.body).append(this.el);
    this.delegateEvents();
    this.center();
    if (this.options.draggable) $(this.el).draggable();
    if (this._returnCloses()) $(document.body).bind('keypress', this._maybeConfirm);
    $(document.body).bind('keydown', this._maybeClose);
    if (cel[0]) _.defer(function(){ cel.focus(); });
    if (!opts.noOverlay && dc.app.workspace) $(document.body).addClass('overlay');
    return this;
  },

  append : function(el) {
    this._controls.before(el);
  },

  addControl : function(el) {
    this._controls.prepend(el);
  },

  val : function() {
    return (this.options.choices && this.options.mode == 'prompt') ?
      this.$('input:radio:checked').val() : this.contentEl.val();
  },

  title : function(title) {
    this.$('.title').text(title);
  },

  cancel : function() {
    if (this.options.onCancel) this.options.onCancel(this);
    this.close();
  },

  info : function(message, leaveOpen) {
    this._information.removeClass('error').text(message).show();
    if (!leaveOpen) this._information.delay(3000).fadeOut();
  },

  error : function(message, leaveOpen) {
    this._information.stop().addClass('error').text(message).show();
    if (!leaveOpen) this._information.delay(3000).fadeOut();
  },

  confirm : function() {
    if (this.options.onConfirm && !this.options.onConfirm(this)) return false;
    this.close();
  },

  close : function() {
    if (this.options.onClose) this.options.onClose(this);
    $(this.el).remove();
    if (this._returnCloses()) $(document.body).unbind('keypress', this._maybeConfirm);
    $(document.body).unbind('keydown', this._maybeClose);
    $(document.body).removeClass('overlay');
  },

  center : function() {
    $(this.el).align(window, '', {top : -50});
  },

  showSpinner : function() {
    this.$('.spinner_dark').show();
  },

  hideSpinner : function() {
    this.$('.spinner_dark').hide();
  },

  validateUrl : function(url) {
    if (dc.app.validator.check(url, 'url')) return true;
    this.error('Please enter a valid URL.');
    return false;
  },

  validateEmail : function(email) {
    if (dc.app.validator.check(email, 'email')) return true;
    this.error('Please enter a valid email address.');
    return false;
  },

  _returnCloses : function() {
    return _.include(['alert', 'short_prompt', 'confirm'], this.options.mode);
  },

  // Close on escape.
  _maybeClose : function(e) {
    if (e.which == 27) this.close();
  },

  _maybeConfirm : function(e) {
    if (e.which == 13) this.confirm();
  },

  _addFocus : function(e) {
    $(e.target).addClass('focus');
    $(this.el).css({zoom : 1});
  },

  _removeFocus : function(e) {
    $(e.target).removeClass('focus');
  }

});

_.extend(dc.ui.Dialog, {

  alert : function(text, options) {
    return new dc.ui.Dialog(_.extend({
      mode      : 'alert',
      title     : null,
      text      : text
    }, options)).render();
  },

  prompt : function(text, content, callback, options) {
    var onConfirm = callback && function(dialog){ return callback(dialog.val(), dialog); };
    return new dc.ui.Dialog(_.extend({
      mode      : 'prompt',
      password  : !!(options && options.password),
      title     : text,
      text      : '',
      content   : content,
      onConfirm : onConfirm
    }, options)).render();
  },

  confirm : function(text, callback, options) {
    return new dc.ui.Dialog(_.extend({
      mode      : 'confirm',
      title     : null,
      text      : text,
      onConfirm : callback
    }, options)).render();
  },

  choose : function(text, choices, callback, options) {
    return new dc.ui.Dialog(_.extend({
      mode      : 'prompt',
      title     : text,
      choices   : choices,
      text      : '',
      onConfirm : callback && function(dialog){ return callback(dialog.val()); }
    }, options)).render();
  },

  contact : function() {
    var callback = function(dialog) {
      var params = {message : dialog.val()};
      if (!dc.account) {
        params.email = dialog.$('.contact_email').val();
        if (!dialog.validateEmail(params.email)) return false;
      }
      $.post('/ajax_help/contact_us', params, function() {
        dc.ui.notifier.show({mode : 'info', text : 'Your message was sent successfully.'});
      });
      return true;
    };
    var dialog = new dc.ui.Dialog({
      id        : 'contact_us',
      mode      : 'custom',
      title     : _.t('contact_us'),
      saveText  : _.t('send'),
      onConfirm : callback
    });
    dialog.render();
    dialog.setMode('prompt', 'dialog');
    dialog.$('.custom').html(JST['common/contact']());
    dialog.contentEl = dialog.$('.content');
    dialog.$('input').placeholder();
    dialog.center();
  },

  progress : function(text, options) {
    return new dc.ui.Dialog(_.extend({
      mode  : 'progress',
      text  : text,
      title : null
    }, options)).render();
  }

});
