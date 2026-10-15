export function totalCents(seats) {
  return seats.reduce((sum, seat) => sum + seat.priceCents, 0);
}
