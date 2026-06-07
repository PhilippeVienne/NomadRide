import { useTranslation } from '../i18n/LanguageContext';

export type ActiveModule = 'explore' | 'shelter' | 'pitstop' | 'wallet' | 'radar';

interface SidebarProps {
  activeModule: ActiveModule;
  setActiveModule: (module: ActiveModule) => void;
}

export default function Sidebar({ activeModule, setActiveModule }: SidebarProps) {
  const { t, language, setLanguage } = useTranslation();

  const navItems: { id: ActiveModule; label: string; icon: string }[] = [
    { id: 'explore', label: t('sidebar.explore'), icon: '🧭' },
    { id: 'shelter', label: t('sidebar.shelter'), icon: '🛖' },
    { id: 'pitstop', label: t('sidebar.pitstop'), icon: '⛽' },
    { id: 'wallet', label: t('sidebar.wallet'), icon: '🪙' },
    { id: 'radar', label: t('sidebar.radar'), icon: '📡' },
  ];

  return (
    <aside className="sidebar">
      <div className="logo-container">
        <div className="logo-text">
          <h1>{t('sidebar.title')}</h1>
          <span>{t('sidebar.subtitle')}</span>
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

      <div className="language-selector" role="group" aria-label="Language Selector">
        <button
          id="lang-btn-fr"
          type="button"
          className={`lang-btn glove-target ${language === 'fr' ? 'active' : ''}`}
          onClick={() => setLanguage('fr')}
        >
          FR
        </button>
        <button
          id="lang-btn-en"
          type="button"
          className={`lang-btn glove-target ${language === 'en' ? 'active' : ''}`}
          onClick={() => setLanguage('en')}
        >
          EN
        </button>
      </div>
    </aside>
  );
}

