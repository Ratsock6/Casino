import '../../styles/components/maintenance.scss';

interface MaintenanceBannerProps {
  scope?: string; // ex: "Le casino" ou "Les machines à sous"
}

// Bandeau discret affiché aux admins quand une maintenance est active.
// Leur rappelle que les joueurs n'ont pas accès, alors qu'eux peuvent naviguer.
const MaintenanceBanner = ({ scope = 'Le casino' }: MaintenanceBannerProps) => {
  return (
    <div className="maintenance-banner">
      <span className="maintenance-banner__icon">🔧</span>
      <span className="maintenance-banner__text">
        <strong>Maintenance active</strong> — {scope} est fermé aux joueurs. Vous y avez accès en tant qu'admin.
      </span>
    </div>
  );
};

export default MaintenanceBanner;
