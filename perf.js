
const _go = (machine, step) => {
  const iterate = () => {
    const startTime = performance.now();
    const maxBlockTime = 5; // max milliseconds to block

    while (!step.done) {
      const { state, value } = step.value();
      switch (state) {
        case 'pause': {
          // Use queueMicrotask for quick operations
          queueMicrotask(() => _go(machine, value));
          return;
        }
        case 'continue': {
          step = machine.next(value);
          break;
        }
      }

      // Check if we've been running too long
      if (performance.now() - startTime > maxBlockTime) {
        // Yield to the event loop using setTimeout
        setTimeout(iterate, 0);
        return;
      }
    }
  };

  // Start the iteration
  queueMicrotask(iterate);
};

// Example of a mixed process with quick and long-running operations
function* mixedProcess() {
  for (let i = 0; i < 1000000; i++) {
    if (i % 1000 === 0) {
      console.log(`Long operation at iteration ${i}`);
      yield () => ({ state: 'pause', value: this.next() });
    } else {
      yield () => ({ state: 'continue', value: null });
    }
  }
}

_go(mixedProcess(), mixedProcess().next());