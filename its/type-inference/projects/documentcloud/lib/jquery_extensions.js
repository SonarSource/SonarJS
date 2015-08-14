(function($) {

  // First things first, add our special CSRF token to every jQuery Ajax
  // request.
  $(document).ajaxSend(function(e, xhr, options) {
    var token = $("meta[name='csrf-token']").attr("content");
    xhr.setRequestHeader("X-CSRF-Token", token);
  });

  var fakeInput = document.createElement('input');
  var supportsPlaceholder = 'placeholder' in fakeInput;

  $.fn.extend({

    // Align an element relative to a target element's coordinates. Forces the
    // element to be absolutely positioned. Element must be visible.
    // Position string format is: "top -right".
    // You can pass an optional offset object with top and left offsets specified.
    align : function(target, pos, offset) {
      var el = this;
      pos = pos || '';
      offset = offset || {};
      var scrollTop = document.documentElement.scrollTop || document.body.scrollTop || 0;
      var scrollLeft = document.documentElement.scrollLeft || document.body.scrollLeft || 0;
      var clientWidth = document.documentElement.clientWidth;
      var clientHeight = document.documentElement.clientHeight;

      if (target == window) {
        var b = {
          left    : scrollLeft,
          top     : scrollTop,
          width   : $(window).width(),
          height  : $(window).height()
        };
      } else {
        target = $(target);
        var targOff = target.offset();
        var b = {
          left    : targOff.left,
          top     : targOff.top,
          width   : target.innerWidth(),
          height  : target.innerHeight()
        };
      }

      var elb = {
        width : el.innerWidth(),
        height : el.innerHeight()
      };

      var left, top;

      if (pos.indexOf('-left') >= 0) {
        left = b.left;
      } else if (pos.indexOf('left') >= 0) {
        left = b.left - elb.width;
      } else if (pos.indexOf('-right') >= 0) {
        left = b.left + b.width - elb.width;
      } else if (pos.indexOf('right') >= 0) {
        left = b.left + b.width;
      } else { // Centered.
        left = b.left + (b.width - elb.width) / 2;
      }

      if (pos.indexOf('-top') >= 0) {
        top = b.top;
      } else if (pos.indexOf('top') >= 0) {
        top = b.top - elb.height;
      } else if (pos.indexOf('-bottom') >= 0) {
        top = b.top + b.height - elb.height;
      } else if (pos.indexOf('bottom') >= 0) {
        top = b.top + b.height;
      } else { // Centered.
        top = b.top + (b.height - elb.height) / 2;
      }

      var constrain = (pos.indexOf('no-constraint') >= 0) ? false : true;

      left += offset.left || 0;
      top += offset.top || 0;

      if (constrain) {
        left = Math.max(scrollLeft, Math.min(left, scrollLeft + clientWidth - elb.width));
        top = Math.max(scrollTop, Math.min(top, scrollTop + clientHeight - elb.height));
      }

      // var offParent;
      // if (offParent = el.offsetParent()) {
      //   left -= offParent.offset().left;
      //   top -= offParent.offset().top;
      // }

      $(el).css({position : 'absolute', left : left + 'px', top : top + 'px'});
      return el;
    },

    // See Backbone.View#setMode...
    setMode : function(state, group) {
      group = group || 'mode';
      var re = new RegExp("\\w+_" + group + "(\\s|$)", 'g');
      var mode = (state === null) ? "" : state + "_" + group;
      this.each(function(){
        this.className = (this.className.replace(re, '') + ' ' + mode).replace(/\s\s/g, ' ');
      });
      return mode;
    },

    // A-la serializeArray but returns a hash instead of a list.
    serializeJSON : function() {
      return _.reduce(this.serializeArray(), function(hash, pair) {
        hash[pair.name] = pair.value;
        return hash;
      }, {});
    },

    // Get the outerHTML for a set of jQuery elements.
    outerHTML : function() {
      return $('<div></div>').append(this.clone()).html();
    },

    // When the next click or keypress happens, anywhere on the screen, hide the
    // element. 'clickable' makes the element and its contents clickable without
    // hiding. The 'onHide' callback runs when the hide fires, and has a chance
    // to cancel it.
    autohide : function(options) {
      var me = this;
      options = _.extend({clickable : null, onHide : null}, options || {});
      me._autoignore = true;
      setTimeout(function(){ delete me._autoignore; }, 0);

      if (!me._autohider) {
        me.forceHide = function(e) {
          if (!e && options.onHide) options.onHide();
          me.hide();
          $(document).unbind('click', me._autohider);
          $(document).unbind('keypress', me._autohider);
          me._autohider = null;
          me.forceHide = null;
        };
        me._autohider = function(e) {
          // Ignore non-left-clicks, which Firefox will persist in triggering.
          if (e.which > 1) return;
          if (me._autoignore) return;
          if (options.clickable && (me[0] == e.target || _.include($(e.target).parents(), me[0]))) return;
          if (options.onHide && !options.onHide(e)) return;
          me.forceHide(e);
        };
        $(document).bind('click', this._autohider);
        $(document).bind('keypress', this._autohider);
      }
    },

    draggable : function(options) {
      options || (options = {});
      this.each(function() {
        var el    = this;
        var ghost = null, xOff = null, yOff = null;

        var stopEvent = function(e) {
          e.stopPropagation();
          e.preventDefault();
          return false;
        };

        var checkEvent = function(e) {
          var isNonDraggable = $(e.target).closest('input, select, textarea, label, a, canvas, .tickLabel, .minibutton, .text_link, .selectable_text, .not_draggable').length;
          if (isNonDraggable) return true;

          var draggableParent = $(e.target).parents('.is_draggable').andSelf().length;
          if (!draggableParent) return true;

          return stopEvent(e);
        };

        var drag = _.bind(function(e) {
          if (!el._drag) return stopEvent(e);
          if (ghost) {
            ghost.css({top : e.pageY - yOff, left : e.pageX - xOff});
          } else {
            el.style.left = el._drag.left + e.pageX - el._drag.x + 'px';
            el.style.top  = el._drag.top + e.pageY - el._drag.y + 'px';
          }
        }, el);

        var dragEnd = _.bind(function(e) {
          $(document.body).unbind('selectstart', stopEvent);
          $(document.body).unbind('mouseup', dragEnd);
          $(document.body).unbind('mousemove', drag);
          $(ghost || el).removeClass('dragging');
          if (ghost) $(ghost).remove();
          el._drag = null;
          if (options.onDrop) options.onDrop(e);
        }, el);

        var dragStart = _.bind(function(e) {
          if (checkEvent(e)) return true;
          if (options.ghost) {
            xOff  = $(el).width() / 2;
            yOff  = $(el).height() / 2;
            ghost = $(el).clone().css({
              position : 'absolute', cursor : 'copy', 'z-index' : 1000, top : e.pageY - yOff, left : e.pageX - xOff
            }).appendTo(document.body);
          }
          $(ghost || el).addClass('dragging');
          el._drag = {
            left : parseInt(el.style.left, 10) || 0,
            top  : parseInt(el.style.top, 10) || 0,
            x    : e.pageX,
            y    : e.pageY
          };
          $(document.body).bind('selectstart', stopEvent);
          $(document.body).bind('mouseup', dragEnd);
          $(document.body).bind('mousemove', drag);
        }, el);

        $(el).bind(options.ghost ? 'dragstart' : 'mousedown', dragStart);
      });
    },

    // Creates a boundary box of selection, used to drag a square lasso
    // around objects (specifically, document tiles). On mouse release,
    // fire `options.onSelect`.
    // TODO: share common bits of this with the annotation_editor.
    selectable : function(options) {
      var doc  = $(document);
      var edge = 17;
      var selection = $('.selection');

      $(this).bind('mousedown', _.bind(function(e) {
        if (e.which > 1) return;
        if (options.ignore && $(e.target).closest(options.ignore).length) return;
        var off = this.offset();
        if ((e.pageX > off.left + this.outerWidth() - edge) ||
            (e.pageY > off.top + this.outerHeight() - edge)) return;
        e.preventDefault();
        if (dc.app.searchBox) {
          dc.app.searchBox.removeFocus();
          dc.app.searchBox.disableFacets();
        }
        var targets = $(options.select);
        var scrTop  = this.scrollTop(), scrLeft = this.scrollLeft();
        var ox = e.pageX, oy = e.pageY;
        var coords = function(e) {
          return {
            left    : Math.min(ox, e.pageX),
            top     : Math.min(oy, e.pageY),
            width   : Math.abs(e.pageX - ox),
            height  : Math.abs(e.pageY - oy)
          };
        };
        var selectTargets = function(e) {
          if (e.pageX == ox && e.pageY == oy) return;
          var pos = coords(e);
          var x1 = pos.left + scrLeft, y1 = pos.top + scrTop, x2 = x1 + pos.width, y2 = y1 + pos.height;
          var hits = [];
          for (var i=0; i<targets.length; i++) {
            var el = $(targets[i]);
            pos = el.offset();
            var ex1 = pos.left + scrLeft, ey1 = pos.top + scrTop, ex2 = ex1 + el.outerWidth(), ey2 = ey1 + el.outerHeight();
            if (!(x1 > ex2 || x2 < ex1 || y1 > ey2 || y2 < ey1)) hits.push(el);
          }
          if (options.onSelect) options.onSelect(hits);
        };
        var drag = _.bind(function(e) {
          e.stopPropagation();
          e.preventDefault();
          selection.show().css(coords(e));
          selectTargets(e);
        }, this);
        var dragEnd = _.bind(function(e) {
          e.stopPropagation();
          e.preventDefault();
          doc.unbind('mouseup', dragEnd).unbind('mousemove', drag);
          selectTargets(e);
          selection.hide();
        }, this);
        doc.bind('mouseup', dragEnd).bind('mousemove', drag);
      }, this));
    },

    // jQuery's default text() method doesn't play nice with contentEditable
    // elements, which insert divs or paras instead of newline characters.
    // Convert them properly.
    textWithNewlines: function( text ) {
      var ret = "";
      $.each(text || this, function(){
        $.each(this.childNodes, function() {
          if (this.nodeType != 8) {
            var tag = this.tagName && this.tagName.toLowerCase();
            if (tag == 'div' || tag == 'p' || tag == 'br') ret += "\n";
            ret += this.nodeType != 1 ? this.nodeValue : $.fn.textWithNewlines([this]);
          }
        });
      });
      return ret;
    },

    placeholder: function(opts) {
      if (supportsPlaceholder) return;
      var options = $.extend({}, {className: 'placeholder'}, opts);
      var otherEl;

      this.each(function() {
        var el = $(this);
        var message = el.attr('placeholder');
        var placeholder = $('<div class="'+options.className+'">' + message + '</div>');
        placeholder.hide().prependTo(el[0].parentNode);
        el.bind('blur', function(){
          if (el.val() == '') placeholder.show();
        });
        el.bind('focus', function(){
          otherEl = this;
          placeholder.hide();
        });
        placeholder.bind('click', function(){
          $(otherEl).blur();
          el.focus();
        });
        el.blur();
      });
    }

  });

  jQuery.expr[':'].focus = function(elem) {
    return elem === document.activeElement && (elem.type || elem.href);
  };

  // Add mousewheel support:
  var types = ['DOMMouseScroll', 'mousewheel'];

  // Documenting *insane* feature detection here. On some webkit/mac versions,
  // `event.wheelDelta` will be precisely 40x too large: multiples of 120,
  // instead of multiples of 3. Try to detect this behavior, the first time
  // this event is triggered.

  var hyperactiveWebkit = null;

  var mouseWheelHandler = function(event) {
      var args = [].slice.call( arguments, 1 ), delta = 0, returnValue = true;
      event = $.event.fix(event || window.event);
      event.type = "mousewheel";
      var wheelDelta = event.wheelDelta || event.originalEvent.wheelDelta;
      if (wheelDelta) {
        delta = wheelDelta / 3;
      } else if (event.detail) {
        delta = -event.detail * 9;
      }
      args.unshift(event, delta);
      return $.event.dispatch.apply(this, args);
  };

  $.event.special.mousewheel = {
    setup: function() {
      if (this.addEventListener) {
        for (var i=types.length; i;) this.addEventListener(types[--i], mouseWheelHandler, false);
      } else {
        this.onmousewheel = mouseWheelHandler;
      }
    },
    teardown: function() {
      if (this.removeEventListener) {
        for (var i=types.length; i;) this.removeEventListener(types[--i], mouseWheelHandler, false);
      } else {
        this.onmousewheel = null;
      }
    }
  };

})(jQuery);