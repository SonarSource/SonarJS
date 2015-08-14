dc.ui.AccountDialog = dc.ui.Dialog.extend({

  id : 'account_list',

  className : 'account_list dialog',

  events : {
    'click .ok'             : 'close',
    'click .new_account'    : 'newAccount',
    'click .edit_language'  : 'showLanguageEdit',
    'click .language_sheet td' : 'chooseLanguage'

  },

  constructor : function() {
    dc.ui.Dialog.call(this, {
      mode          : 'custom',
      title         : ( Accounts.current().isAdmin() ?
                                    _.t('manage_organization', dc.account.organization().get('name') ) :
                                    _.t('manage_account' ) ),
      information   : 'group: ' + dc.account.organization().get('slug')
    });
    Accounts.bind('reset', _.bind(this._renderAccounts, this));
    this._rendered = false;
    this._open = false;
    $(this.el).hide();
  },

  render : function() {
    dc.ui.Dialog.prototype.render.call(this);
    this._rendered = true;
    this._container = this.$('.custom');
    this._container.setMode('not', 'draggable');
    this._container.html(JST['account/dialog']( dc.account.toJSON() ));
    this.list = this.$('.account_list_content');
    this._renderAccounts();
    if ( Accounts.current().isAdmin() ) {
      this.addControl(this.make('div', {'class': 'minibutton dark new_account' }, _.t('new_account') ));
    }
    return this;
  },

  open : function() {
    this._open = true;
    if (!this._rendered) {
      this.render();
      return;
    }
    $(document.body).addClass('overlay');
    this.center();
    $(this.el).show();
  },

  close : function() {
    dc.ui.notifier.hide();
    $(this.el).hide();
    $(document.body).removeClass('overlay');
    this._open = false;
  },

  showLanguageEdit: function(ev){
    var sheet = $(ev.target).closest('.language').siblings('.language_sheet');
    if ( ! sheet.toggle().is(":visible") ){
      return;
    }
  },

  chooseLanguage: function(ev){
    var target = $(ev.target);
    var language = target.attr('data-lang');
    if ( ! language ){
      return;
    }
    target.closest('table').find('td').removeClass('active');
    target.addClass('active');
    if ( target.closest('.organization_language').length ){
      dc.account.organization().set({ language: language });
      dc.account.organization().save();
    } else {
      target.closest('tr.editing').prev().trigger('chosen', language );
    }
    _.delay( function(){
      target.closest('.language_sheet').hide();
    }, 500);  // wait a bit so they can see that the languages was chosen
  },

  isOpen : function() {
    return this._open;
  },

  newAccount : function() {
    var view = new dc.ui.AccountView({
      model : new dc.model.Account(),
      kind : 'row',
      dialog : this
    });
    this.list.append(view.render('edit').el);
    this._container[0].scrollTop = this._container[0].scrollHeight;
  },

  _renderAccounts : function() {
    dc.ui.spinner.hide();
    var views = Accounts.map(function(account) {
      return (new dc.ui.AccountView({model : account, kind : 'row'})).render().el;
    });
    this.list.append(views);
    $(this.el).show();
    this.center();
  }

});
