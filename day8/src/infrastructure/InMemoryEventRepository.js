export class InMemoryEventRepository {
  constructor(db) { this.db = db; }

  async search(query = '') {
    const q = query.trim().toLowerCase();
    return [...this.db.events.values()]
      .filter((e) => !q || e.title.toLowerCase().includes(q) || e.venue.toLowerCase().includes(q))
      .sort((a, b) => a.startsAt - b.startsAt)
      .map((e) => ({ ...e }));
  }

  async findById(id) {
    const event = this.db.events.get(id);
    return event ? { ...event } : null;
  }
}
