// There's only a single global instance of the Spinner. show() it, passing in
// a message, and hide() it when the corresponding action has finished.
dc.ui.spinner = {

  show : function(message) {
    this.ensureElement();
    message = message || "Loading";
    this.el.stop(true, true).fadeIn('fast');
  },

  hide : function() {
    this.ensureElement();
    this.el.stop(true, true).fadeOut('fast', function(){ $(this).css({display : 'none'}); });
  },

  ensureElement : function() {
    this.el || (this.el = $('#spinner'));
  }

};

_.bindAll(dc.ui.spinner, 'show', 'hide');