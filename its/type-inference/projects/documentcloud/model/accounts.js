// Account Model

dc.model.Account = Backbone.Model.extend({

  DISABLED           : 0,
  ADMINISTRATOR      : 1,
  CONTRIBUTOR        : 2,
  REVIEWER           : 3,
  FREELANCER         : 4,

  ROLE_NAMES         : ['disabled', 'administrator', 'contributor', 'reviewer', 'freelancer'], // NB: Indexed by role number.

  GRAVATAR_BASE      : location.protocol + (location.protocol == 'https:' ? '//secure.' : '//www.') + 'gravatar.com/avatar/',

  DEFAULT_AVATAR     : location.protocol + '//' + location.host + '/images/embed/icons/user_blue_32.png',

  defaults           : { first_name : '', last_name : '', email : '', role : 2 },
  
  initialize: function(options) {
    this.memberships = new Backbone.Collection();
    if (this.get('memberships')) { this.memberships.reset(this.get('memberships')); }
  },
  
  currentOrganization: function(){
    return this.organization();
  },

  organization : function() {
    var default_membership = this.memberships.find(function(m){ return m.get('default'); });
    return Organizations.get(default_membership.get('organization_id'));
  },
  
  organization_ids: function() { return this.memberships.pluck('organization_id'); },
  
  organizations: function() {
    var ids = this.organization_ids();
    return new dc.model.OrganizationSet(Organizations.filter(function(org){ return _.contains(ids, org.get('id'));}));
  },

  openDocuments : function(options) {
    options || (options = {});
    var suffix = options.published ? ' ' + _.t('filter') +':' + ' ' + _.t('published') : '';
    dc.app.searcher.search(_.t('account') + ':' + this.get('slug') + suffix);
  },

  openOrganizationDocuments : function() {
    dc.app.searcher.search( _.t('group') + ': ' + dc.account.organization().get('slug'));
  },

  allowedToEdit: function(model) {
    return this.ownsOrOrganization(model) || this.collaborates(model);
  },

  ownsOrOrganization: function(model) {
    return (model.get('account_id') == this.id) ||
           (model.get('organization_id') == this.get('organization_id') &&
            (this.isAdmin() || this.isContributor()) &&
            _.contains([
              dc.access.PUBLIC, dc.access.EXCLUSIVE, dc.access.ORGANIZATION,
              'public', 'exclusive', 'organization'
            ], model.get('access')));
  },

  collaborates: function(model) {
    var docId      = model.get('document_id') || model.id;
    var projectIds = model.get('project_ids');

    for (var i = 0, l = Projects.length; i < l; i++) {
      var project = Projects.models[i];
      if (_.contains(projectIds, project.get('id')) && !project.get('hidden')) {
        for (var j = 0, k = project.collaborators.length; j < k; j++) {
          var collab = project.collaborators.models[j];
          if (collab.ownsOrOrganization(model)) return true;
        }
      }
    }

    return false;
  },

  fullName : function(nonbreaking) {
    var name = this.get('first_name') + ' ' + this.get('last_name');
    return nonbreaking ? name.replace(/\s/g, '&nbsp;') : name;
  },

  documentsTitle : function() {
    return dc.inflector.possessivize(this.fullName()) + ' ' + _.t('documents');
  },

  isAdmin : function() {
    return this.attributes.role == this.ADMINISTRATOR;
  },

  isContributor : function() {
    return this.attributes.role == this.CONTRIBUTOR;
  },

  isReviewer : function() {
    return this.attributes.role == this.REVIEWER;
  },

  isReal : function() {
    var role = this.attributes.role;
    return role == this.ADMINISTRATOR || role == this.CONTRIBUTOR || role == this.FREELANCER;
  },

  isPending : function() {
    return !!this.get('pending');
  },

  searchUrl : function() {
    return "/#search/" + encodeURIComponent("account: " + this.get('slug'));
  },

  gravatarUrl : function(size) {
    var hash = this.get('hashed_email');
    var fallback = encodeURIComponent(this.DEFAULT_AVATAR);
    return this.GRAVATAR_BASE + hash + '.jpg?s=' + size + '&d=' + fallback;
  },

  resendWelcomeEmail: function(options) {
    var url = '/accounts/' + this.id + '/resend_welcome';
    $.ajax(_.extend(options || {}, {type : 'POST', dataType : 'json', url : url}));
  }

});

// Account Set
dc.model.AccountSet = Backbone.Collection.extend({

  model : dc.model.Account,
  url   : '/accounts',

  comparator : function(account) {
    return (account.get('last_name') || '').toLowerCase() + ' ' + (account.get('first_name') || '').toLowerCase();
  },

  getBySlug : function(slug) {
    return this.detect(function(account) {
      return account.get('slug') === slug;
    });
  },
  
  getByEmail: function(email) {
    return this.detect(function(account){
      return account.get('email') === email;
    });
  },
  
  getValidByEmail: function(email) {
    return this.detect(function(account){
      return !account.invalid && account.get('email') === email;
    });
  },

  // Fetch the account of the logged-in journalist.
  current : function() {
    if (!dc.account) return null;
    return this.get(dc.account.id);
  },

  // All accounts other than yours.
  others : function() {
    return this.filter(function(account) {
      return account.id !== dc.account.id;
    });
  },

  // If the contributor has logged-out of the workspace in a different tab,
  // force the logout here.
  forceLogout : function() {
    dc.ui.Dialog.alert('You are no longer logged in to DocumentCloud.', {onClose : function() {
      window.location = '/logout';
    }});
  }

});

window.Accounts = new dc.model.AccountSet();
