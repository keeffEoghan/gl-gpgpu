/**
 * Different modes of time-stepping - frame-time, real-time, constant-step.
 *
 * @todo Separate module?
 *
 * @type {object.<(number|string)>}
 */
export const timings = {
    tick: 'tick',
    time: 'time',
    fixed: 1000/60
};

export const defaultTiming = timings.tick;

export function getTiming(api, state, out = {}) {
    const { now } = api;

    const {
            timing = defaultTiming,
            // The initial time - `-1` for frame-time, or the current time for
            // real-time or constant-step. Should be reset if `out.timing` is
            // changed.
            time = ((timing === 'tick')? 0 : now())
        } = state;


    out.timing = timing;
    out.time = time;

    out.update = (api, state) => {
        const { timing = defaultTiming, time: t0 } = state;

        // Step the timer - add constant-step, or update to current tick/time.
        state.time = ((isNaN(timing))?
                // Can be a number value or a function.
                ((isNaN(api[timing]))? api[timing]() : api[timing])
            :   t0+timing);

        state.dt = state.time-t0;

        return state;
    };

    return out;
}
