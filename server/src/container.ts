import { AuthService } from './services/auth.service';
import { DropService } from './services/drop.service';
import { ReservationService } from './services/reservation.service';
import { AuthController } from './controllers/auth.controller';
import { DropController } from './controllers/drop.controller';

// Instantiate services
const authService = new AuthService();
const dropService = new DropService();
const reservationService = new ReservationService();

// Inject services into controllers via constructor
const authController = new AuthController(authService);
const dropController = new DropController(dropService, reservationService);

export {
  authService,
  dropService,
  reservationService,
  authController,
  dropController
};
