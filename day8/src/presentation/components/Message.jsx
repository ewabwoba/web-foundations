export default function Message({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div className={`message message--${message.type}`} role={message.type === 'error' ? 'alert' : 'status'}>
      <span>{message.text}</span>
      {onDismiss && <button type="button" className="link-button" onClick={onDismiss}>Dismiss</button>}
    </div>
  );
}
