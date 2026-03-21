import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CasinoConfigService } from '../../casino-config/casino-config.service';

export const MAINTENANCE_KEY = 'maintenance_key';
export const Maintenance = (key: string) =>
  Reflect.metadata(MAINTENANCE_KEY, key);

@Injectable()
export class MaintenanceGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly casinoConfigService: CasinoConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const globalMaintenance = await this.casinoConfigService.getBoolean(
      'MAINTENANCE_GLOBAL', false
    );
    if (globalMaintenance) {
      throw new ServiceUnavailableException(
        'Le casino est actuellement en maintenance. Veuillez réessayer plus tard.'
      );
    }

    const maintenanceKey = this.reflector.get<string>(
      MAINTENANCE_KEY,
      context.getHandler(),
    );

    if (maintenanceKey) {
      const gameMaintenance = await this.casinoConfigService.getBoolean(
        maintenanceKey, false
      );
      if (gameMaintenance) {
        throw new ServiceUnavailableException(
          'Ce jeu est actuellement en maintenance. Veuillez réessayer plus tard.'
        );
      }
    }

    return true;
  }
}
