export default function Header({ route }) {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <a className="logo" href="#/">TicketHub</a>
        <nav aria-label="Main">
          <a href="#/" aria-current={route.name !== 'tickets' ? 'page' : undefined}>Events</a>
          <a href="#/tickets" aria-current={route.name === 'tickets' ? 'page' : undefined}>My tickets</a>
        </nav>
      </div>
    </header>
  );
}
