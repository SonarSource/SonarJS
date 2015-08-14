dc.ui.AnnotationEditor = Backbone.View.extend({

  id : 'annotation_editor',

  events : {
    'click .close': 'close'
  },

  initialize: function(options) {
    // track open/close state
    this._open    = false;
    // cache of button DOM elements
    this._buttons = {};
    // Annotation endpoint.
    this._baseURL = '/documents/' + dc.app.editor.docId + '/annotations';
    this._inserts = $('.DV-pageNoteInsert');
    // list of positions to redact.
    this.redactions = [];
    _.bindAll(this, 'open', 'close', 'drawAnnotation', 'saveAnnotation',
      'deleteAnnotation', 'createPageNote');
    currentDocument.api.onAnnotationSave(this.saveAnnotation);
    currentDocument.api.onAnnotationDelete(this.deleteAnnotation);
    this._inserts.click(this.createPageNote);
  },

  open : function(kind) {
    this._open          = true;

    // cache references to elements
    this._buttons[kind] = $('#control_panel .' + kind + '_annotation');
    this.pages          = $('.DV-pages');
    this.page           = $('.DV-page');
    this._guide         = $('#' + kind + '_note_guide');

    this.redactions     = [];
    this.page.css({cursor : 'crosshair'});
    if (kind != 'redact') this._inserts.filter('.visible').show().addClass('DV-' + kind);

    // Start drawing region when user mousesdown
    this.page.bind('mousedown', this.drawAnnotation);
    $(document).bind('keydown', this.close);

    $(document.body).setMode(kind, 'editing');
    this._buttons[kind].addClass('open');
    this._guide.fadeIn('fast');
  },

  close : function() {
    this._open = false;
    this.page.css({cursor : ''});
    this.page.unbind('mousedown', this.drawAnnotation);
    $(document).unbind('keydown', this.close);
    this.clearAnnotation();
    this.clearRedactions();
    this._inserts.hide().removeClass('DV-public DV-private');
    $(document.body).setMode(null, 'editing');
    this._buttons[this._kind].removeClass('open');
    this._guide.hide();
  },

  toggle : function(kind) {
    if (this._open) {
      this.close();
      if (kind === this._kind) return;
    }
    this.open(this._kind = kind);
  },

  clearAnnotation : function() {
    if (this.region) $(this.region).remove();
  },

  clearRedactions : function() {
    $('.DV-annotationRegion.DV-accessRedact').remove();
  },

  // When a page note insert line is clicked, create a page annotation above
  // the corresponding page.
  createPageNote : function(e) {
    this.close();
    var set = $(e.target).closest('.DV-set');
    var pageNumber = currentDocument.api.getPageNumberForId(set.attr('data-id'));
    currentDocument.api.addAnnotation({
      page            : pageNumber,
      unsaved         : true,
      access          : this._kind || 'public',
      owns_note       : true
    });
  },

  // TODO: Clean up!
  drawAnnotation : function(e) {
    e.stopPropagation();
    e.preventDefault();
    this._activePage = $(e.currentTarget);
    // not sure why this isn't just currentDocument.api.getPageNumber
    this._activePageNumber = currentDocument.api.getPageNumberForId($(this._activePage).closest('.DV-set').attr('data-id'));
    this.clearAnnotation(); // close any open annotation.

    // Record the page boundaries and the starting position for the click+drag
    var offTop        = this._activePage.offset().top,
        offLeft       = this._activePage.offset().left,
        xStart        = e.pageX - offLeft,
        yStart        = e.pageY - offTop,
        borderBottom  = this._activePage.height() - 6,
        borderRight   = this._activePage.width() - 6;

    // Create a div to represent the highlighted region
    this.region = this.make('div', {'class' : 'DV-annotationRegion active ' + this._accessClass(this._kind), style:'position:absolute;'});
    (this._kind == 'redact' ? this._specificPage() : this._activePage).append(this.region);

    var contained = function(e) {
      return e.pageX > 0 && e.pageX < borderRight &&
             e.pageY > 0 && e.pageY < borderBottom;
    };
    var coords = function(e) {
      var x = e.pageX - offLeft - 3,
          y = e.pageY - offTop - 3;
      // keep ending position for drag in bounds
      x = x < 0 ? 0 : (x > borderRight ? borderRight : x);
      y = y < 0 ? 0 : (y > borderBottom ? borderBottom : y);
      return {
        left    : Math.min(xStart, x),
        top     : Math.min(yStart, y),
        width   : Math.abs(x - xStart),
        height  : Math.abs(y - yStart)
      };
    };

    // set the highlighted region's boundaries
    $(this.region).css(coords(e));
    // and continue to update the region's boundaries when the mouse moves.
    var drag = _.bind(function(e) {
      $(this.region).css(coords(e));
      return false;
    }, this);
    this.pages.on('mousemove', drag);

    // when drag is finished
    var dragEnd = _.bind(function(e) {
      // clean up event listeners
      $(document).unbind('keydown', this.close);
      this.pages.unbind('mouseup', dragEnd).unbind('mousemove', drag);

      // calculate highlighted region's dimensions
      var loc     = coords(e);
      loc.left    -= 1;
      loc.top     -= 1;
      loc.right   = loc.left + loc.width;
      loc.bottom  = loc.top + loc.height;
      if (this._kind != 'redact') {
        loc.top     += 2;
        loc.left    += 5;
        loc.right   += 15;
        loc.bottom  += 5;
      }

      // Use the document's current zoom level to scale the region
      // into normalized coordinates
      var zoom    = currentDocument.api.relativeZoom();
      var image   = _.map([loc.top, loc.right, loc.bottom, loc.left], function(l){ return Math.round(l / zoom); }).join(',');
      if (this._kind == 'redact') {
        // ignoring redactions too small to cover anything,
        // record redaction dimensions and which page to apply them to
        if (loc.width > 5 && loc.height > 5) {
          this.redactions.push({
            location: image,
            page: this._activePageNumber
          });
        } else {
          $(this.region).remove();
        }
        this.region = null;
      } else {
        // Close the editor
        this.close();
        // Instruct the viewer to create a note, if the region is large enough.
        if (loc.width > 5 && loc.height > 5) {
          currentDocument.api.addAnnotation({
            location        : {image : image},
            page            : this._activePageNumber,
            unsaved         : true,
            access          : this._kind,
            owns_note       : true
          });
        }
      }
      return false;
    }, this);
    this.pages.bind('mouseup', dragEnd);
  },

  saveAnnotation : function(anno) {
    this[anno.unsaved ? 'createAnnotation' : 'updateAnnotation'](anno);
  },

  // Convert an annotation object into serializable params understood by us.
  annotationToParams : function(anno, extra) {
    delete anno.unsaved;
    var params = {
      page_number : anno.page,
      content     : anno.text,
      title       : anno.title,
      access      : anno.access
    };
    if (anno.location) params.location = anno.location.image;
    return _.extend(params, extra || {});
  },

  createAnnotation : function(anno) {
    var params = this.annotationToParams(anno);
    $.ajax({url : this._baseURL, type : 'POST', data : params, dataType : 'json', success : _.bind(function(resp) {
      anno.server_id = resp.id;
      this._adjustNoteCount(1, this._kind == 'public' ? 1 : 0);
    }, this)});
  },

  updateAnnotation : function(anno) {
    var url     = this._baseURL + '/' + anno.server_id;
    var params  = this.annotationToParams(anno, {_method : 'put'});
    $.ajax({url : url, type : 'POST', data : params, dataType : 'json'});
  },

  deleteAnnotation : function(anno) {
    if (!anno.server_id) return;
    var url = this._baseURL + '/' + anno.server_id;
    $.ajax({url : url, type : 'POST', data : {_method : 'delete'}, dataType : 'json', success : _.bind(function() {
      this._adjustNoteCount(-1, (this._kind == 'public' || anno.access == 'public') ? -1 : 0);
    }, this)});
  },

  // Lazily create the page-specific div for persistent elements.
  _specificPage : function() {
    // if a div for redaction already exists, return it.
    var already = $('.DV-pageSpecific-' + this._activePageNumber);
    if (already.length) return already;
    // otherwise make a div for redactions to be written into
    var el = this.make('div', {'class' : 'DV-pageSpecific DV-pageSpecific-' + this._activePageNumber});
    this._activePage.append(el);
    return $(el);
  },

  _adjustNoteCount : function(notesCount, publicCount) {
    try {
      var id = parseInt(currentDocument.api.getId(), 10);
      var doc = window.opener.Documents.get(id);
      if (doc) {
        doc.set({annotation_count : (doc.get('annotation_count') || 0) + notesCount});
        doc.set({public_note_count : (doc.get('public_note_count') || 0) + publicCount});
      }
    } catch (e) {
      // It's ok -- we don't have access to the parent window.
    }
  },

  _accessClass : function(kind) {
    return 'DV-access' + dc.inflector.capitalize(kind);
  }

});
