// GET /users/me/tickets
export const makeGetMyTickets = ({ orderRepository, eventRepository, seatRepository }) =>
  async function getMyTickets({ userId }) {
    const orders = await orderRepository.findByUser(userId);
    const tickets = [];
    for (const order of orders) {
      const event = await eventRepository.findById(order.eventId);
      const seats = await seatRepository.findByIds(order.tickets.map((t) => t.seatId));
      for (const ticket of order.tickets) {
        const seat = seats.find((s) => s.id === ticket.seatId);
        tickets.push({
          id: ticket.id,
          orderId: order.id,
          eventTitle: event.title,
          venue: event.venue,
          startsAt: event.startsAt,
          seatLabel: seat.label,
          priceCents: seat.priceCents,
        });
      }
    }
    return tickets.sort((a, b) => a.startsAt - b.startsAt);
  };
