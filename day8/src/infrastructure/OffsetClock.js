// A clock we can fast-forward, so a 5-minute hold can be demonstrated in seconds.
export class OffsetClock {
  constructor() { this.offset = 0; }
  now() { return Date.now() + this.offset; }
  advance(ms) { this.offset += ms; }
}
