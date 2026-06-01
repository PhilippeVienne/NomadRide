export type ActiveModule = 'explore' | 'shelter' | 'pitstop' | 'wallet' | 'radar';

interface SidebarProps {
  activeModule: ActiveModule;
  setActiveModule: (module: ActiveModule) => void;
}

export default function Sidebar({ activeModule, setActiveModule }: SidebarProps) {
  const navItems: { id: ActiveModule; label: string; icon: string }[] = [
    { id: 'explore', label: 'Explore', icon: '🧭' },
    { id: 'shelter', label: 'Shelter', icon: '🛖' },
    { id: 'pitstop', label: 'Pit-Stop', icon: '⛽' },
    { id: 'wallet', label: 'Wallet', icon: '🪙' },
    { id: 'radar', label: 'Radar', icon: '📡' },
  ];

  return (
    <aside className="sidebar">
      <div className="logo-container">
        <div className="logo-text">
          <h1>NomadRide</h1>
          <span>Rider Companion</span>
        </div>
      </div>

      <nav className="nav-menu" aria-label="Main Navigation">
        {navItems.map((item) => (
          <button
            id={`nav-btn-${item.id}`}
            key={item.id}
            onClick={() => setActiveModule(item.id)}
            className={`glove-target nav-item ${activeModule === item.id ? 'active' : ''}`}
          >
            <span className="nav-item-icon" aria-hidden="true">{item.icon}</span>
            <span className="nav-item-label">{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
