import { log, COLORS } from "./log";

// CSP is defined with channels, and go blocks.
// Channels are used to communicate between go blocks.
// Go blocks are used to run code concurrently.
// Go blocks can take and put values to channels.
// This *apparently* can be implemented with js generators and an executor / scheduler.
// This is an experiment to see how that works for myself.

// This is a simple example of a CSP implementation in JS.

// Generators yield values to the scheduler.
type ChannelState = "continue" | "pause" | "sleep" | "fork";
type Channel<T> = T[];
type Gen = Generator<any>;

// When you call a generator, it returns an object with a value and a done property.

/**
 * Exhaustively drains the supplied generator until the machine yields execution back to the scheduler.
 */
const _go = (
  gen: Gen,
  stepResult: IteratorResult<() => [ChannelState, any | undefined], void>,
): void => {
  while (!stepResult.done) {
    const [state, value] = stepResult.value();

    // Check the state of the machine. ('continue' or 'pause')
    switch (state) {
      case "pause": {
        // Queue up another invocation of _go with the same machine and step.
        setTimeout(() => _go(gen, stepResult));
        return;
      }
      case "continue": {
        stepResult = gen.next(value);
        break;
      }

      case "sleep": {
        setTimeout(() => {
          const nextResult = gen.next(); // Advance the generator.
          _go(gen, nextResult);
        }, value);

        return;
      }
    }
  }
  console.debug("[GO]: Routine concluded.");
};

const go = (makeGen: () => Gen): void => {
  const gen = makeGen();
  _go(gen, gen.next());
};

const put = <T>(
  chan: Channel<T>,
  val: T,
): (() => [ChannelState, undefined]) => {
  return () => {
    if (chan.length === 0) {
      chan.unshift(val);
      return ["continue", undefined];
    } else {
      return ["pause", undefined];
    }
  };
};

const take = <T>(chan: Channel<T>): (() => [ChannelState, T | undefined]) => {
  return () => {
    if (chan.length === 0) {
      return ["pause", undefined];
    } else {
      const val = chan.pop();
      return ["continue", val];
    }
  };
};

const sleep = (ms: number) => {
  return () => {
    return ["sleep", ms];
  };
};

const alts = (...channels: Channel<any>) => {
  return () => {
    for (const chan of channels) {
      if (chan.length > 0) {
        const val = chan.pop();
        return ["continue", val];
      }
    }
    return ["pause", undefined];
  };
};

const chan = <T>(): Channel<T> => [];

// Basic example.
const ch = chan<string | number>();

go(function* () {
  yield put(ch, 1);
  yield put(ch, 2);

  yield sleep(1000);

  yield put(ch, 3);
});

go(function* () {
  const value1 = yield take(ch);
  console.log("First value is", value1);
  const value2 = yield take(ch);
  console.log("Second value is", value2);
  const value3 = yield take(ch);
  console.log("Third value is", value3);
});

const chan1 = chan<string>();
const chan2 = chan<string>();

go(function* () {
  yield put(chan1, "Value on chan 1");
  yield put(chan2, "Value on chan 2");
});

go(function* () {
  const value = yield alts(chan1, chan2);
  console.log(value);

  const value2 = yield alts(chan1, chan2);
  console.log(value2);
});

const pingPongChan = chan<string>();

go(function* () {
  while (true) {
    yield put(pingPongChan, "ping");
    log(COLORS.CYAN, "PING", "Sent ping");
    yield sleep(1000);
    const res = yield take(pingPongChan);
    log(COLORS.CYAN, "PING", `Received ${res}`);
    yield sleep(1000);
  }
});

go(function* () {
  while (true) {
    const val = yield take(pingPongChan);
    log(COLORS.MAGENTA, "PONG", `Received ${val}`);
    yield sleep(1000);
    yield put(pingPongChan, "pong");
    log(COLORS.MAGENTA, "PONG", "Sent pong");
    yield sleep(1000);
  }
});
