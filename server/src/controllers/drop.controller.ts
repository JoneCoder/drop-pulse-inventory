import { Request, Response } from 'express';
import { DropService } from '../services/drop.service';
import { ReservationService } from '../services/reservation.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class DropController {
  constructor(
    private dropService: DropService,
    private reservationService: ReservationService
  ) {}

  public getActiveDrops = async (req: Request, res: Response) => {
    try {
      const drops = await this.dropService.getActiveDrops();
      return res.status(200).json(drops);
    } catch (error: any) {
      return res.status(500).json({ message: error.message || 'Internal server error' });
    }
  };

  public createDrop = async (req: Request, res: Response) => {
    try {
      const drop = await this.dropService.createDrop(req.body);
      return res.status(201).json(drop);
    } catch (error: any) {
      return res.status(500).json({ message: error.message || 'Internal server error' });
    }
  };

  public reserveItem = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const { drop_id } = req.body;

      if (!userId) {
        return res.status(401).json({ message: 'User unauthorized' });
      }

      if (!drop_id) {
        return res.status(400).json({ message: 'Drop ID is required' });
      }

      const result = await this.reservationService.createReservation(userId, drop_id);
      return res.status(200).json(result);
    } catch (error: any) {
      const status = error.status || 500;
      return res.status(status).json({ message: error.message || 'Internal server error' });
    }
  };

  public purchaseItem = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const { reservation_id } = req.body;

      if (!userId) {
        return res.status(401).json({ message: 'User unauthorized' });
      }

      if (!reservation_id) {
        return res.status(400).json({ message: 'Reservation ID is required' });
      }

      const result = await this.reservationService.purchaseItem(userId, reservation_id);
      return res.status(200).json(result);
    } catch (error: any) {
      const status = error.status || 500;
      return res.status(status).json({ message: error.message || 'Internal server error' });
    }
  };
}
