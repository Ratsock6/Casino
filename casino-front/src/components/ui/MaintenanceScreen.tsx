import React from 'react';
import '../../styles/components/maintenance.scss';

interface MaintenanceScreenProps {
  game?: string;
  global?: boolean;
}

const MaintenanceScreen = ({ game, global }: MaintenanceScreenProps) => {
  return (
    <div className="maintenance">
      <div className="maintenance__icon">🔧</div>
      <h2 className="maintenance__title">
        {global ? 'Casino en maintenance' : `${game} en maintenance`}
      </h2>
      <p className="maintenance__message">
        {global
          ? 'Le casino est temporairement fermé pour maintenance. Nous serons de retour très prochainement.'
          : `Ce jeu est temporairement indisponible pour maintenance. Veuillez réessayer plus tard.`}
      </p>
      <div className="maintenance__badge">
        ⏳ Maintenance en cours
      </div>
    </div>
  );
};

export default MaintenanceScreen;