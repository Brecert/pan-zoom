'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

/**
 * @module  pan-zoom
 *
 * Events for pan and zoom
 */
const Impetus = require('impetus');

const wheel = require('mouse-wheel');

const touchPinch = require('touch-pinch');

const position = require('touch-position');

const raf = require('raf');

const hasPassive = require('has-passive-events');

function panZoom(target, cb) {
  if (target instanceof Function) {
    cb = target;
    target = document.documentElement || document.body;
  }

  if (typeof target === 'string') target = document.querySelector(target); //enable panning

  const touch = position.emitter({
    element: target
  });
  let impetus;
  let initX = 0;
  let initY = 0;
  let init = true;

  const initFn = e => {
    init = true;
  };

  target.addEventListener('mousedown', initFn);
  target.addEventListener('touchstart', initFn, hasPassive ? {
    passive: true
  } : false);
  let lastY = 0;
  let lastX = 0;
  impetus = new Impetus({
    source: target,
    update: (x, y) => {
      if (init) {
        init = false;
        initX = touch.position[0];
        initY = touch.position[1];
      }

      const e = {
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
    },
    multiplier: 1,
    friction: 0.75
  }); //enable zooming

  const wheelListener = wheel(target, (dx, dy, dz, e) => {
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
  }); //mobile pinch zoom

  const pinch = touchPinch(target);
  const mult = 2;
  let initialCoords;
  pinch.on('start', curr => {
    const f1 = pinch.fingers[0];
    const f2 = pinch.fingers[1];
    initialCoords = [f2.position[0] * 0.5 + f1.position[0] * 0.5, f2.position[1] * 0.5 + f1.position[1] * 0.5];
    impetus && impetus.pause();
  });
  pinch.on('end', () => {
    if (!initialCoords) return;
    initialCoords = null;
    impetus && impetus.resume();
  });
  pinch.on('change', (curr, prev) => {
    if (!pinch.pinching || !initialCoords) return;
    schedule({
      target,
      type: 'touch',
      dx: 0,
      dy: 0,
      dz: -(curr - prev) * mult,
      x: initialCoords[0],
      y: initialCoords[1],
      x0: initialCoords[0],
      y0: initialCoords[0]
    });
  }); // schedule function to current or next frame

  let planned;
  let frameId;

  function schedule(ev) {
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


    frameId = raf(() => {
      cb(ev);
      frameId = null;

      if (planned) {
        const arg = planned;
        planned = null;
        schedule(arg);
      }
    });
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
