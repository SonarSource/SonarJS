dc.ui.ProjectDialog = dc.ui.Dialog.extend({

  id : 'project_dialog',

  events : {
    'click .ok'                     : 'confirm',
    'click .cancel'                 : 'close',
    'click .delete'                 : '_deleteProject',
    'click .add_collaborator'       : '_showEnterEmail',
    'click .minibutton.add'         : '_addCollaborator',
    'keypress #collaborator_email'  : '_maybeAddCollaborator',
    'click .remove'                 : '_removeCollaborator'
  },

  constructor : function(options) {
    this.model = options.model;
    dc.ui.Dialog.call(this, {
      mode        : 'custom',
      title       : _.t('edit_x', this.model.get('title') )
    });
  },

  render : function(noHide) {
    if (!noHide) $(this.el).hide();
    dc.ui.Dialog.prototype.render.call(this, {editor : true, information : this.model.statistics()});
    this.$('.custom').html(JST['organizer/project_dialog']({model : this.model}));
    this.$('#project_title').val(this.model.get('title'));
    this.$('#project_description').val(this.model.get('description') || '');
    if (!this.model.get('owner')) this.$('.minibutton.delete').text("Remove");
    if (this.model.collaborators.length) {
      var views = this.model.collaborators.map(_.bind(function(account) {
        return (new dc.ui.AccountView({model : account, kind : 'collaborator'})).render(null, {project : this.model}).el;
      }, this));
      this.$('.collaborator_list tbody').append(views);
      this.$('.collaborators').show();
    }
    $(this.el).show();
    this.center();
    this._setPlaceholders();
    return this;
  },

  confirm : function() {
    var project     = this.model;
    var title       = this.$('#project_title').val();
    var description = this.$('#project_description').val();
    var already = Projects.any(function(other) {
      return (other !== project) && (other.get('title') == title);
    });
    if (!title)  return this.error("Please specify a project title.");
    if (already) return this.error("There is already a project with that title.");
    this.model.save({
      title       : title,
      description : description
    });
    this.close();
  },

  _setPlaceholders : function() {
    this.$('#project_title, #project_description').placeholder();
  },

  // If we don't own it, a request to remove the project is a request to remove
  // ourselves as a collaborator.
  _deleteProject : function() {
    var wasOpen = Projects.selected()[0] == this.model;
    if (!this.model.get('owner')) {
      Projects.remove(this.model);
      var me = Accounts.current().clone();
      me.collection = this.model.collaborators;
      me.destroy();
    } else {
      this.model.destroy();
    }
    this.close();
    if (wasOpen && !dc.app.searcher.flags.outstandingSearch) {
      dc.app.searcher.loadDefault({clear : true});
    }
  },

  _maybeAddCollaborator : function(e) {
    if (e.which == 13) this._addCollaborator();
  },

  _addCollaborator : function() {
    var email = this.$('#collaborator_email').val();
    if (!email) return this.error('Please enter an email address.');
    this.showSpinner();
    this.model.collaborators.create({email : email}, {
      wait: true,
      success : _.bind(function(acc, resp) {
        this.model.trigger('change', this.model);
        this.render(true);
      }, this),
      error   : _.bind(function(acc, resp) {
        errorResp = JSON.parse(resp.responseText);
        if (errorResp.errors) {
          this.error(errorResp.errors[0]);
        } else {
          this.error('No DocumentCloud account was found with that email.');
        }
        this.hideSpinner();
      }, this)
    });
  },

  _removeCollaborator : function(e) {
    this.showSpinner();
    var collab = this.model.collaborators.get(parseInt($(e.target).attr('data-id'), 10));
    collab.destroy({
      success : _.bind(function(){
        this.model.trigger('change', this.model);
        this.render(true);
      }, this)
    });
  },

  _showEnterEmail : function() {
    this.$('.add_collaborator').hide();
    this.$('.enter_email').show();
    this.$('#collaborator_email').focus();
  }

});
