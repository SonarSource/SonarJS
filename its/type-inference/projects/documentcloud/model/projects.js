// Project Model

dc.model.Project = Backbone.Model.extend({

  constructor : function(attrs, options) {
    var collabs = attrs.collaborators || [];
    delete attrs.collaborators;
    Backbone.Model.call(this, attrs, options);
    this.collaborators = new dc.model.AccountSet(collabs);
    this._setCollaboratorsResource();
  },

  set : function(attrs, options) {
    attrs || (attrs = {});
    if (attrs.title)            attrs.title = dc.inflector.trim(attrs.title).replace(/"/g, '');
    if (attrs.account_id)       attrs.owner = attrs.account_id == dc.account.id;
    Backbone.Model.prototype.set.call(this, attrs, options);
    if (attrs.id) this._setCollaboratorsResource();
    return this;
  },

  // Generate the canonical slug for this Project. Usable by API calls.
  slug : function() {
    return this.id + '-' + dc.inflector.sluggify(this.get('title'));
  },

  open : function() {
    dc.app.searcher.search(this.toSearchParam());
  },

  edit : function() {
    $(document.body).append((new dc.ui.ProjectDialog({model : this})).render().el);
  },

  addDocuments : function(documents) {
    var projectId  = this.get('id');
    var ids        = _.uniq(_.pluck(documents, 'id'));
    var addedCount = _.reduce(documents, function(sum, doc) {
      var docProjectIds = doc.get('project_ids');
      if (!_.contains(docProjectIds, projectId)) {
        doc.set({project_ids: docProjectIds.concat([projectId])});
        sum += 1;
      }
      return sum;
    }, 0);
    if (addedCount) {
      this.set({document_count : this.get('document_count') + addedCount});
      this.notifyProjectChange(addedCount, false);
      $.ajax({
        url     : '/projects/' + projectId + '/add_documents',
        type    : 'POST',
        data    : {document_ids : ids},
        success : _.bind(function(resp) {
          this.set(resp);
        }, this)
      });
    }
  },

  removeDocuments : function(documents, localOnly) {
    var projectId     = this.get('id');
    var ids           = _.uniq(_.pluck(documents, 'id'));
    var removedCount  = _.reduce(documents, function(sum, doc) {
      var docProjectIds = doc.get('project_ids');
      if (_.contains(docProjectIds, projectId)) {
        doc.set({project_ids: _.without(docProjectIds, projectId)});
        sum += 1;
      }
      return sum;
    }, 0);

    if (removedCount) {
      var annotationsRemovedCount = _.reduce(documents, function(sum, doc) {
        sum += doc.get('annotation_count');
        return sum;
      }, 0);
      if (Projects.firstSelected() === this) Documents.remove(documents);
      this.set({document_count : this.get('document_count') - removedCount});
      this.set({annotation_count : this.get('annotation_count') - annotationsRemovedCount});
      this.notifyProjectChange(removedCount, true);
      if (!localOnly) {
        $.ajax({
          url : '/projects/' + projectId + '/remove_documents',
          type : 'POST',
          data : {document_ids : ids},
          success : _.bind(function(resp) {
            this.set(resp);
          }, this)
        });
      }
    }
  },

  notifyProjectChange : function(numDocs, removal) {
    var key = removal ? 'removed_from_x_documents' : 'added_to_x_documents'
    var projectTitle = this.get('title');
    dc.ui.notifier.show({mode : 'info', text : _.t( key, numDocs, projectTitle ) } );
  },

  // Does this project already contain a given document?
  contains : function(doc) {
    return _.contains(doc.get('project_ids'), this.get('id'));
  },

  // Does this project already contain any of the given documents?
  containsAny : function(docs) {
    var me = this;
    return _.any(docs, function(doc){ return me.contains(doc); });
  },

  // Return the title of this project as a search parameter.
  toSearchParam : function() {
    return _.t('project') + ': ' + dc.app.searcher.quote(this.get('title'));
  },

  statistics : function() {
    var docCount    = this.get('document_count');
    var noteCount   = this.get('annotation_count');
    var shareCount  = this.collaborators.length;
    return _.t('x_documents', docCount )
      + ', ' + _.t('x_notes', noteCount )
      + (shareCount ? ', ' + _.t('x_collaborators', shareCount ) : '');
  },

  _setCollaboratorsResource : function() {
    if (!(this.collaborators && this.id)) return;
    this.collaborators.url = '/projects/' + this.id + '/collaborators';
  }

});

dc.model.Project.topLevelTitle = function(type) {
  return _.t( type );
};

// Project Set
dc.model.ProjectSet = Backbone.Collection.extend({

  model : dc.model.Project,

  url   : '/projects',

  comparator : function(m) {
    return m.get('title').toLowerCase();
  },

  // Find a project by title.
  find : function(title) {
    return this.detect(function(m) {
      return m.get('title').toLowerCase() == title.toLowerCase();
    });
  },

  // Find all projects starting with a given prefix, for autocompletion.
  startingWith : function(prefix) {
    var matcher = new RegExp('^' + prefix);
    return this.select(function(m){ return !!m.get('title').match(matcher); });
  },

  // Increment the document_count attribute of a given project, by id.
  incrementCountById : function(id) {
    var project = this.get(id);
    project.set({document_count : project.get('document_count') + 1});
  },

  // When documents are deleted, remove all of their matches.
  removeDocuments : function(docs) {
    this.each(function(project) { project.removeDocuments(docs, true); });
  }

});

_.extend(dc.model.ProjectSet.prototype, dc.model.Selectable);

window.Projects = new dc.model.ProjectSet();
