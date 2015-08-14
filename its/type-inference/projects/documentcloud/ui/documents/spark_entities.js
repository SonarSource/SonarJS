dc.ui.SparkEntities = Backbone.View.extend({

  BLOCK_WIDTH: 275,

  LEFT_WIDTH: 120,

  RIGHT_MARGIN: 50,

  MAX_WIDTH: 700,

  TOOLTIP_DELAY: 200,

  RESIZE_DELAY: 333,

  SEARCH_DISTANCE: 5,

  events: {
    'click .cancel_search'           : 'hide',
    'click .show_all'                : 'renderKind',
    'click .entity_line_title'       : '_showPages',
    'click .entity_list_title'       : '_showPages',
    'click .entity_bucket_wrap'      : '_openEntity',
    'click .arrow.left'              : 'render',
    'mouseleave .entity_buckets'     : 'hideTooltip',
    'mouseenter .entity_bucket_wrap' : '_onMouseEnter',
    'mouseleave .entity_bucket_wrap' : '_onMouseLeave'
  },

  initialize : function(options) {
    this.options || (this.options = options);
    this.template = JST['document/entities'];
    this.options.container.append(this.el);
    this.showLater = _.debounce(this.showLater, this.TOOLTIP_DELAY);
    this.rerenderLater = _.debounce(_.bind(this.rerender, this), this.RESIZE_DELAY);
    this._renderState = {doc: this.model, distance: this.SEARCH_DISTANCE};
  },

  show : function() {
    this._open = true;
    $(window).bind('resize.entities', this.rerenderLater);
    this.render();
  },

  render : function() {
    this._renderState.only = false;
    this.rerender();
    return this;
  },

  renderKind : function(e) {
    this._renderState.only = $(e.currentTarget).attr('data-kind');
    this.rerender();
    this.model.trigger('focus');
  },

  calculateWidth : function() {
    var elWidth = $(this.el).width();
    if (this._renderState.only) {
      return Math.min(elWidth - (this.LEFT_WIDTH + this.RIGHT_MARGIN), this.MAX_WIDTH);
    } else {
      var rows = Math.floor(elWidth / (this.BLOCK_WIDTH + this.LEFT_WIDTH + this.RIGHT_MARGIN));
      return Math.min(Math.floor((elWidth - ((this.LEFT_WIDTH + this.RIGHT_MARGIN) * rows)) / rows), this.MAX_WIDTH);
    }
  },

  rerender : function() {
    this.options.container.show();
    var options = _.extend(this._renderState, {width: this.calculateWidth()});
    $(this.el).html(this.template(options));
  },

  hide : function() {
    this._open = false;
    $(window).unbind('resize.entities', this.rerenderLater);
    $(this.el).html('');
    this.options.container.hide();
  },

  showTooltip : function() {
    if (!this._current) return;
    var excerpt;
    var next = _.bind(function(excerpt) {
      if (this._current) {
        dc.ui.tooltip.show({
          left      : this._current.offset().left,
          top       : this._current.offset().top + 15,
          title     : this._entity.get('value'),
          text      : '<b>p.' + excerpt.page_number + '</b> ' + dc.inflector.trimExcerpt(excerpt.excerpt),
          leaveOpen : true
        });
      }
    }, this);
    if (excerpt = this._entity.excerpts[this._occurrence]) {
      next(excerpt);
    } else {
      this.showLater(next);
    }
  },

  showLater : function(next) {
    if (this._current) this._entity.loadExcerpt(this._occurrence, next);
  },

  hideTooltip : function() {
    dc.ui.tooltip.hide();
  },

  _setCurrent : function(e) {
    var found;
    var occ = 'data-occurrence';
    var el = $(e.currentTarget);
    if (el.hasClass('occurs')) {
      var found = el;
    } else {
      var index = el.index();
      var buckets = el.parent().children();
      for (var i = 1, l = this.SEARCH_DISTANCE; i <= l; i++) {
        var after = buckets[index + i], before = buckets[index - i];
        if (el = ($(after).hasClass('occurs') && $(after)) ||
                 ($(before).hasClass('occurs') && $(before))) break;
      }
    }
    if (!el) {
      this.hideTooltip();
      return false;
    }
    el.addClass('active');
    this._current = el;
    this._occurrence = el.find('.entity_bucket').attr(occ);
    var id = el.closest('.entity_line').attr('data-id');
    this._entity = this.model.entities.get(id);
    return true;
  },

  _openEntity : function(e) {
    if (!this._setCurrent(e)) return;
    this.model.openEntity(this._entity.id, this._occurrence.split(':')[0]);
  },

  _onMouseEnter : function(e) {
    if (!this._setCurrent(e)) return;
    this.showTooltip();
  },

  _onMouseLeave : function() {
    if (this._current) this._current.removeClass('active');
    this._occurrence = this._entity = this._current = null;
  },

  _showPages : function(e) {
    var id = $(e.currentTarget).closest('[data-id]').attr('data-id');
    dc.model.Entity.fetchId(this.model.id, id, _.bind(function(entities) {
      this.hide();
      this.model.pageEntities.reset(entities);
    }, this));
  }

});
