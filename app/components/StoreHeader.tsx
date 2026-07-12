export function StoreHeader() {
  return (
    <nav className="nav site-nav" aria-label="Main navigation">
      <a className="brand" href="/" aria-label="Cricket Central home">
        <span className="brand-logo" aria-hidden="true" />
        Cricket Central
      </a>
      <div className="nav-links">
        <a href="/">Home</a>
        <a href="/collection">Collection</a>
        <a href="/account">Account</a>
        <a href="/tracking">Tracking</a>
        <a href="/admin">Admin</a>
      </div>
    </nav>
  );
}
