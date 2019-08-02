(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('impetus'), require('mouse-wheel'), require('touch-pinch'), require('touch-position'), require('raf'), require('has-passive-events')) :
  typeof define === 'function' && define.amd ? define(['exports', 'impetus', 'mouse-wheel', 'touch-pinch', 'touch-position', 'raf', 'has-passive-events'], factory) :
  (global = global || self, factory(global['pan-zoom'] = {}, global.Impetus, global.wheel, global.touchPinch, global.position, global.raf, global.hasPassive));
}(this, function (exports, Impetus, wheel, touchPinch, position, raf, hasPassive) { 'use strict';

  Impetus = Impetus && Impetus.hasOwnProperty('default') ? Impetus['default'] : Impetus;
  wheel = wheel && wheel.hasOwnProperty('default') ? wheel['default'] : wheel;
  touchPinch = touchPinch && touchPinch.hasOwnProperty('default') ? touchPinch['default'] : touchPinch;
  position = position && position.hasOwnProperty('default') ? position['default'] : position;
  raf = raf && raf.hasOwnProperty('default') ? raf['default'] : raf;
  hasPassive = hasPassive && hasPassive.hasOwnProperty('default') ? hasPassive['default'] : hasPassive;

  function _newArrowCheck(innerThis, boundThis) {
    if (innerThis !== boundThis) {
      throw new TypeError("Cannot instantiate an arrow function");
    }
  }

  function panZoom(target, cb) {
    var _this = this;

    if (target instanceof Function) {
      cb = target;
      target = document.documentElement || document.body;
    }

    if (typeof target === 'string') target = document.querySelector(target); //enable panning

    var touch = position.emitter({
      element: target
    });
    var impetus;
    var initX = 0;
    var initY = 0;
    var init = true;

    var initFn = function initFn(e) {
      _newArrowCheck(this, _this);

      init = true;
    }.bind(this);

    target.addEventListener('mousedown', initFn);
    target.addEventListener('touchstart', initFn, hasPassive ? {
      passive: true
    } : false);
    var lastY = 0;
    var lastX = 0;
    impetus = new Impetus({
      source: target,
      update: function update(x, y) {
        _newArrowCheck(this, _this);

        if (init) {
          init = false;
          initX = touch.position[0];
          initY = touch.position[1];
        }

        var e = {
          target: target,
          type: 'mouse',
          dx: x - lastX,
          dy: y - lastY,
          dz: 0,
          x: touch.position[0],
          y: touch.position[1],
          x0: initX,
          y0: initY
        };
        lastX = x;
        lastY = y;
        schedule(e);
      }.bind(this),
      multiplier: 1,
      friction: 0.75
    }); //enable zooming

    var wheelListener = wheel(target, function (dx, dy, dz, e) {
      _newArrowCheck(this, _this);

      e.preventDefault();
      schedule({
        target: target,
        type: 'mouse',
        dx: 0,
        dy: 0,
        dz: dy,
        x: touch.position[0],
        y: touch.position[1],
        x0: touch.position[0],
        y0: touch.position[1]
      });
    }.bind(this)); //mobile pinch zoom

    var pinch = touchPinch(target);
    var mult = 2;
    var initialCoords;
    pinch.on('start', function (curr) {
      _newArrowCheck(this, _this);

      var f1 = pinch.fingers[0];
      var f2 = pinch.fingers[1];
      initialCoords = [f2.position[0] * 0.5 + f1.position[0] * 0.5, f2.position[1] * 0.5 + f1.position[1] * 0.5];
      impetus && impetus.pause();
    }.bind(this));
    pinch.on('end', function () {
      _newArrowCheck(this, _this);

      if (!initialCoords) return;
      initialCoords = null;
      impetus && impetus.resume();
    }.bind(this));
    pinch.on('change', function (curr, prev) {
      _newArrowCheck(this, _this);

      if (!pinch.pinching || !initialCoords) return;
      schedule({
        target: target,
        type: 'touch',
        dx: 0,
        dy: 0,
        dz: -(curr - prev) * mult,
        x: initialCoords[0],
        y: initialCoords[1],
        x0: initialCoords[0],
        y0: initialCoords[0]
      });
    }.bind(this)); // schedule function to current or next frame

    var planned;
    var frameId;

    function schedule(ev) {
      var _this2 = this;

      if (frameId != null) {
        if (!planned) planned = ev;else {
          planned.dx += ev.dx;
          planned.dy += ev.dy;
          planned.dz += ev.dz;
          planned.x = ev.x;
          planned.y = ev.y;
        }
        return;
      } // Firefox sometimes does not clear webgl current drawing buffer
      // so we have to schedule callback to the next frame, not the current
      // cb(ev)


      frameId = raf(function () {
        _newArrowCheck(this, _this2);

        cb(ev);
        frameId = null;

        if (planned) {
          var arg = planned;
          planned = null;
          schedule(arg);
        }
      }.bind(this));
    }

    return function unpanzoom() {
      touch.dispose();

      if (target instanceof HTMLElement) {
        target.removeEventListener('mousedown', initFn);
        target.removeEventListener('touchstart', initFn);
        impetus.destroy();
        target.removeEventListener('wheel', wheelListener);
        pinch.disable();
        raf.cancel(frameId);
      }
    };
  }

  exports.default = panZoom;

  Object.defineProperty(exports, '__esModule', { value: true });

}));
