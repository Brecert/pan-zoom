import Impetus from 'impetus';
import wheel from 'mouse-wheel';
import touchPinch from 'touch-pinch';
import position from 'touch-position';
import raf from 'raf';
import hasPassive from 'has-passive-events';

/**
 * @module  pan-zoom
 *
 * Events for pan and zoom
 */
function panZoom(target, cb) {
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

  var initFn = e => {
    init = true;
  };

  target.addEventListener('mousedown', initFn);
  target.addEventListener('touchstart', initFn, hasPassive ? {
    passive: true
  } : false);
  var lastY = 0;
  var lastX = 0;
  impetus = new Impetus({
    source: target,
    update: (x, y) => {
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
    },
    multiplier: 1,
    friction: 0.75
  }); //enable zooming

  var wheelListener = wheel(target, (dx, dy, dz, e) => {
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

  var pinch = touchPinch(target);
  var mult = 2;
  var initialCoords;
  pinch.on('start', curr => {
    var f1 = pinch.fingers[0];
    var f2 = pinch.fingers[1];
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

  var planned;
  var frameId;

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
        var arg = planned;
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

export default panZoom;
