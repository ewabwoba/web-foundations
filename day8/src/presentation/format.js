export const formatMoney = (cents) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
    .format(cents / 100);

export const formatDate = (ms) =>
  new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    .format(new Date(ms));

export const formatCountdown = (ms) => {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = String(total % 60).padStart(2, '0');
  return `${m}:${s}`;
};

/** Turns any thrown error into a sentence a user can act on. */
export const errorMessage = (error) =>
  error && error.status ? error.message : 'Something went wrong on our side. Please try again.';
