dc.ui.ShareDialog = dc.ui.Dialog.extend({

  id                    : 'share_dialog',
  className             : 'dialog',

  events : {
    'click .close':                            'close',
    'click .preview':                          'previewEmail',
    'click .next':                             '_nextStep',
    'click .previous':                         '_previousStep',
    'click .add_reviewer':                     '_showEnterEmail',
    'click .cancel_add':                       '_cancelAddReviewer',
    'click .minibutton.add':                   '_submitAddReviewer',
    'click .remove_reviewer':                  '_removeReviewer',
    'click .resend_reviewer':                  '_resendInstructions',
    'keypress .reviewer_management_email':     '_maybeAddReviewer',
    'keypress .reviewer_management_firstname': '_maybeAddReviewer',
    'keypress .reviewer_management_lastname':  '_maybeAddReviewer'
  },

  EMAIL_DIALOG_OPTIONS : {
    mode:        'short_prompt',
    description: _.t('reviewer_enter_email'),
    saveText:    _.t('next'),
    closeText:   _.t('cancel')
  },

  initialize : function(options) {
    _.bindAll(this, '_renderReviewers', '_refreshReviewers',
                    '_onAddSuccess', '_onAddError', '_onRemoveSuccess', '_onRemoveError',
                    '_showEnterEmail', '_nextStep');
    this.renderedAccounts = {};
    this._boundRender     = [];
    this.currentStep      = 1;
    this.newReviewers     = [];
    this.docs             = new dc.model.DocumentSet(options.docs);

    $(this.el).hide().empty();
    dc.ui.spinner.show();
    this.fetchReviewers();

    if (this.docs.all(function(doc) { return doc.get('reviewer_count') == 0; })) {
      this.renderEmailDialog();
    }
    dc.ui.Dialog.prototype.initialize.call(this, options);
  },

  render : function() {
    dc.ui.Dialog.prototype.render.call(this);
    this.setMode('share', 'dialog');
    this._container = this.$('.custom');
    this._container.html(JST['account/share_dialog']({
      'defaultAvatar' : dc.model.Account.prototype.DEFAULT_AVATAR,
      'docCount': this.docs.length
    }));
    this._next     = this.$('.next');
    this._previous = this.$('.previous');
    this._emailEl  = this.$('.reviewer_management input[name=email]');
    $(this.el).show();
    dc.ui.spinner.hide();
    this._setPlaceholders();
    this._setStep();
    this._enabledNextButton();
    this.center();
    return this;
  },

  // An array of all the reviewers in the selected documents (non-unique).
  reviewers : function() {
    return _.flatten(this.docs.map(function(doc) {
      return doc.reviewers.models;
    }));
  },

  // An array of all the accounts we need to email.
  accountsToEmail : function() {
    return _.uniq(_.filter(this.reviewers(), function(acc) {
      return acc.get('needsEmail');
    }));
  },

  // Run an iterator over each reviewer in our document list.
  eachReviewer : function(iterator) {
    _.each(this.reviewers(), _.bind(iterator, this));
  },

  // Return a list of documents that have reviewers (by id).
  docsForReviewers : function(reviewerIds) {
    return this.docs.select(function(doc) {
      return _.any(reviewerIds, function(id) {
        return doc.reviewers.get(id);
      });
    });
  },

  renderEmailDialog : function() {
    var docSize = this.docs.length;
    var title = _.t('share_x_documents', this.docs.length, dc.inflector.truncate(this.docs.first().get('title'), 35) );

    this.showingEmailDialog = true;
    dc.ui.spinner.hide();

    dc.ui.Dialog.prompt(title, '', _.bind(function(email) {
      this.showingEmailDialog = false;
      this._renderReviewers();
      this._showEnterEmail();
      this._focusEmail(email);
      this._submitAddReviewer();
      return true;
    }, this), this.EMAIL_DIALOG_OPTIONS);
  },

  managementError : function(message, warn) {
    this.$('.reviewer_management .error').toggleClass('error_white', !warn).text(message);
  },

  customMessage : function() {
    return dc.inflector.trim(this.$('.email_message').val());
  },

  previewEmail : function() {
    var docs = this.docsForReviewers(_.pluck(this.accountsToEmail(), 'id'));
    var ids  = _.map(docs, function(doc){ return 'document_ids[]=' + doc.id; }).join('&');
    window.open('/reviewers/preview_email?' + ids + '&message=' + encodeURIComponent(this.customMessage()));
  },

  // =======================
  // = Rendering Reviewers =
  // =======================

  fetchReviewers : function() {
    $.ajax({
      url : '/reviewers',
      type : 'GET',
      data : {document_ids: this.docs.pluck('id')},
      success: this._refreshReviewers,
      error : this._renderReviewers
    });
  },

  _refreshReviewers : function(resp) {
    if (this.showingEmailDialog) return;

    _.each(resp.reviewers, _.bind(function(reviewers, document_id) {
      this.docs.get(document_id).reviewers.reset(reviewers);
    }, this));
    this._renderReviewers();
  },

  _renderReviewers : function() {
    this.render();
    var views = [];
    this._countDocuments();
    this.renderedAccounts = {};
    this.eachReviewer(function(account) {
      var accountView = this._renderReviewer(account);
      if (accountView) views.push(accountView);
    });

    this.$('.account_list_content tr:not(.reviewer_management)').remove();
    this.$('.account_list_content').prepend(views);
    this.$('.document_reviewers_empty').toggle(!_.keys(this.renderedAccounts).length);
    this._cancelAddReviewer();
  },

  _setPlaceholders : function() {
    this.$('input[name=first_name], input[name=last_name]').placeholder();
    this._emailEl.placeholder();
  },

  _countDocuments : function() {
    var counts = this.accountDocumentCounts = {};
    this.eachReviewer(function(account) {
      counts[account.id] = (counts[account.id] || 0) + 1;
    });
  },

  _renderReviewer : function(account) {
    if (this.renderedAccounts[account.id]) return;

    var view = this.renderedAccounts[account.id] = new dc.ui.AccountView({
      model  : account,
      kind   : 'reviewer',
      dialog : this
    });
    this._rerenderReviewer(account);

    account.bind('change:needsEmail', _.bind(this._enabledNextButton, this));
    account.bind('change:needsEmail', _.bind(this._rerenderReviewer, this, account));

    this._observeReviewer(account, view);

    return view.el;
  },

  _rerenderReviewer : function(account) {
    this.renderedAccounts[account.id].render('display', {
      documentCount  : this.accountDocumentCounts[account.id],
      documentsCount : this.docs.length
    });
  },

  _observeReviewer : function(account, view) {
    account.unbind('change', view._boundRender);
    if (this._boundRender[account.id]) account.unbind('change', this._boundRender[account.id]);
    this._boundRender[account.id] = _.bind(this._rerenderReviewer, this, account);
    account.bind('change', this._boundRender[account.id]);
  },

  // ==================================
  // = Add/Remove Reviewer Management =
  // ==================================

  _showEnterEmail : function() {
    if (this.showingManagement) return this._submitAddReviewer(this._showEnterEmail);

    this.showingManagement = true;
    this.$('.reviewer_management').show();
    this.$('.document_reviewers_empty').hide();
    this._focusEmail();
    this._enabledNextButton();
  },

  _focusEmail : function(email) {
    var $reviewers = this.$('.document_reviewers');
    $reviewers.attr('scrollTop', $reviewers.attr("scrollHeight")+100);
    this._emailEl.focus();

    if (email)  this._emailEl.val(email);
    var email = this._emailEl.val();
    if (!email) this.managementError( _.t('please_enter_email') );
  },

  _cancelAddReviewer : function() {
    this.showingManagement = false;
    this.$('.reviewer_management').hide();
    this.$('.reviewer_management input').val('');
    this.$('.document_reviewers_empty').toggle(!_.keys(this.renderedAccounts).length);
    this._enabledNextButton();
  },

  // Try to add reviewer on `enter` key.
  _maybeAddReviewer : function(e) {
    if (e.which == 13) this._submitAddReviewer();
  },

  _submitAddReviewer : function(callback, dismissEmpty) {
    var email = this._emailEl.val();
    if (!email.length && this.accountsToEmail().length && dismissEmpty) {
      this._cancelAddReviewer();
      return callback();
    }
    if (!dc.app.validator.check(email, 'email')) {
      this._focusEmail();
      this.managementError(_.t('please_enter_valid_email'), true);
      return false;
    }

    this.showSpinner();
    $.ajax({
      url : '/reviewers',
      type : 'POST',
      data : {
        email         : dc.inflector.trim(email),
        first_name    : dc.inflector.trim(this.$('.reviewer_management input[name=first_name]').val()),
        last_name     : dc.inflector.trim(this.$('.reviewer_management input[name=last_name]').val()),
        document_ids  : this.docs.pluck('id')
      },
      success: _.bind(function(resp) { this._onAddSuccess(resp, callback); }, this),
      error : this._onAddError
    });
  },

  _onAddSuccess : function(resp, callback) {
    _.each(resp.documents, function(doc) {
      Documents.get(doc.id).set(doc);
    });
    var newAccount = new dc.model.Account(resp.account);
    this.docs.each(function(doc) {
      var account = doc.reviewers.get(newAccount.id);
      if (!account) doc.reviewers.add(newAccount);
      (account || newAccount).set({needsEmail: true});
    });
    this.showingManagement = false;
    this._renderReviewers();
    if (callback) callback();
    this._enabledNextButton();
  },

  _onAddError : function(resp) {
    var status = resp.status;

    resp = JSON.parse(resp.responseText);
    if (resp.errors && _.any(resp.errors, function(error) {
      error = error.toLowerCase();
      return error.indexOf("first name") != -1 || error.indexOf("last name") != -1;
    })) {
      this._showReviewerNameInputs();
      this.managementError( _.t('reviewer_name') );
    } else if (resp.errors) {
      this.managementError(resp.errors[0], true);
    } else if (status == 403) {
      this.error( _.t('reviewer_add_permission_denied'));
    } else {
      this.managementError( _.t('reviewer_enter_email'), true);
    }
    this.hideSpinner();
    this._focusEmail();
    this._enabledNextButton();
  },

  _showReviewerNameInputs : function() {
    this.$('input[name=first_name], input[name=last_name]').show();
    this.$('.enter_full_name_label').show();
    this.$('.enter_email_label').hide();
    this._setPlaceholders();
  },

  _removeReviewer : function(e) {
    this.showSpinner();
    var accountId    = parseInt($(e.target).attr('data-account-id'), 10);
    var account      = _.detect(this.reviewers(), function(acc){ return acc.id == accountId; });
    var reviewerDocs = this.docsForReviewers([account.id]);
    var documentIds  = _.pluck(reviewerDocs, 'id');

    $.ajax({
      url : '/reviewers/' + accountId,
      type : 'DELETE',
      data : {
        account_id : accountId,
        document_ids : documentIds
      },
      success: _.bind(function(resp) {
        this._onRemoveSuccess(resp, documentIds, account);
      }, this),
      error : this._onRemoveError
    });
    this._enabledNextButton();
  },

  _onRemoveSuccess : function(resp, documentIds, account) {
    _.each(resp, function(doc) {
      Documents.get(doc.id).set(doc);
    });
    this.docs.each(_.bind(function(doc) {
      if (_.contains(documentIds, doc.id)) {
        doc.reviewers.remove(account);
      }
    }, this));
    dc.ui.notifier.show({
      text      : _.t('x_is_no_longer_a_reviewer_on_x', account.get('email'), documentIds.length ),
      duration  : 5000,
      mode      : 'info'
    });
    this._renderReviewers();
    this._enabledNextButton();
  },

  _onRemoveError : function(resp) {
    this.hideSpinner();
     if (resp.status == 403) {
       this.error( _.t('reviewer_remove_permission_denied') );
    } else {
      this.error( _.t('reviewer_remove_error') );
    }
    this._enabledNextButton();
  },

  _resendInstructions : function(e) {
    var accountId = parseInt($(e.target).attr('data-account-id'), 10);
    this.eachReviewer(function(account) {
      if (account.id == accountId) account.set({needsEmail: true});
    });

    this._enabledNextButton();
    this._nextStep();
  },

  // ====================
  // = Step Two: Emails =
  // ====================

  _setEmailDescription : function() {
    var emails = dc.inflector.commify(
      _.map( this.accountsToEmail(),
             function(a){ return a.fullName(); }
           )
      ,{conjunction: 'and'});
    this.$('.email_description').html( _.t('reviewer_email_message', emails ) );
  },

  _sendInstructions : function() {
    var accounts = this.accountsToEmail();
    this.showSpinner();

    this._next.setMode('not', 'enabled');
    this._next.html( _.t('sending') );

    var accountIds  = _.pluck(accounts, 'id');
    var documents   = this.docsForReviewers(accountIds);
    var documentIds = _.pluck(documents, 'id');
    var message     = this.customMessage();

    $.ajax({
      url : '/reviewers/send_email',
      type : 'POST',
      data : {account_ids : accountIds, document_ids : documentIds, message : message},
      success: _.bind(function(resp) {
        var account =  (accounts.length == 1 ? accounts[0].get('email') : accounts.length + ' people' );

        var text = (documentIds.length == 1 ?
                    _.t('reviewing_instructions_single_sent_to',
                        dc.inflector.truncate(this.docs.get(documentIds[0]).get('title'), 30), account ) :
                    _.t('reviewing_instructions_multiple_sent_to', documentIds.length, account )
                   );

        dc.ui.notifier.show({
          text     : text,
          duration : 5000,
          mode     : 'info'
        });

        this.hideSpinner();
        this.close();
      }, this),
      error : _.bind(function(resp) {
        this.hideSpinner();
        this.error( _.t('reviewing_instructions_send_failure') );
        this._setStep();
        this._enabledNextButton();
      }, this)
    });
  },

  // =========
  // = Steps =
  // =========

  _enabledNextButton : function() {
    this._nextEnabled = this.accountsToEmail().length || this.showingManagement;
    this._next.setMode(this._nextEnabled ? 'is' : 'not', 'enabled');
  },

  _setStep : function() {
    var title = this._displayTitle();
    this.title(title);
    var last = this.currentStep == 2;

    this._next.html(last ? _.t('send') : _.t('next') + ' &raquo;');
    this.setMode('p' + this.currentStep, 'step');
    if (last) this._setEmailDescription();
  },

  _displayTitle : function() {
    if (this.currentStep == 1) {
      return _.t("share_x_documents", this.docs.length, dc.inflector.truncate(this.docs.first().get('title'), 30) );
    } else {
      var accounts = this.accountsToEmail();
      return _.t('reviewer_email_instructions', accounts.length, accounts[0].fullName() );
    }
  },

  _nextStep : function() {
    if (!this._nextEnabled) return;
    if (this.showingManagement) return this._submitAddReviewer(this._nextStep, true);
    if (this.currentStep >= 2) {
      this._sendInstructions();
    } else {
      this.currentStep += 1;
      this._setStep();
    }
  },

  _previousStep : function() {
    if (this.currentStep > 1) this.currentStep -= 1;
    this._setStep();
  }

});
