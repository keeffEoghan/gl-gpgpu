import { mix } from '@thi.ng/math/mix';
import { maddNS2 } from '@thi.ng/vectors/maddns';
import { setS } from '@thi.ng/vectors/sets';
import { cartesian3 } from '@thi.ng/vectors/cartesian';

import { axis2 } from './axis2';

const { random, min, PI: pi, TAU: tau = pi*2 } = Math;

/**
 * Shake a point around while idling; a wandering polar arc along the surface of
 * a sphere around the given position.
 *
 * @param {number[]} at The original given position.
 * @param {object} state The shake state.
 * @param {number[]} state.to The shaken output position.
 * @param {number[]} state.pole The `pole` axis from `at` to the surface; polar.
 * @param {number} state.radius How far from `at` the `pole` extends.
 * @param {number} state.turn The angle the sphere polar angles are turned by.
 * @param {number} state.yaw The angular speed that the `turn` can yaw by.
 * @param {number} state.spin The angular speed to `turn` the `pole` axis by.
 * @param {number} state.wait How long to idle before reaching `radius`.
 * @param {number} state.curve A power to curve the idling to reach `radius`.
 * @param {number} idle How long has been spent idling.
 * @param {number} dt The time elapsed since the last frame.
 *
 * @returns {number[]} The position shaken `to`, or the given `at` if it'd be
 *   the same.
 */
export function shake(at, state, idle, dt) {
  const {
      radius, yaw, spin, turn, wait: w, curve = 5,
      to = state.to = [], pole = state.pole = [0, random()*tau, random()*tau]
    } = state;

  if(!(pole[0] = w && idle && (min(idle/w, 1)**curve)*radius)) { return at; }

  const t = state.turn = ((turn == null)? random()*tau
    : (turn+(yaw && dt && mix(-pi, pi, random())*yaw*dt)%tau));

  /** Scale `turn` direction by `spin` angular speed to add to `pole` angles. */
  spin && dt && maddNS2(pole, axis2(t, to), spin*tau*dt, pole, 1, 0, 1);
  cartesian3(to, pole, at);

  const atl = at.length;

  /** Just copy over any other values following the first position values. */
  return (((to.length = atl) > 3)? setS(to, at, atl-3, 3, 3) : to);
}

export default shake;
