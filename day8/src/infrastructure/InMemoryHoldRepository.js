export class InMemoryHoldRepository {
  constructor(db) { this.db = db; }

  async save(hold) { this.db.holds.set(hold.id, { ...hold }); }

  async findById(id) {
    const hold = this.db.holds.get(id);
    return hold ? { ...hold } : null;
  }

  async findActiveByUserAndEvent(userId, eventId, now) {
    for (const hold of this.db.holds.values()) {
      if (hold.userId === userId && hold.eventId === eventId && hold.expiresAt > now) {
        return { ...hold };
      }
    }
    return null;
  }

  async delete(id) { this.db.holds.delete(id); }

  async deleteExpired(now) {
    for (const [id, hold] of this.db.holds) {
      if (hold.expiresAt <= now) this.db.holds.delete(id);
    }
  }
}
