export class SequentialIdGenerator {
  constructor(db) { this.db = db; }
  next(kind) { return this.db.nextId[kind]++; }
}
