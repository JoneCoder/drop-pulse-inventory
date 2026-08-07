import { Request, Response } from 'express';
import { DropService } from '../services/drop.service';
import { reservationService } from '../services/reservation.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

const dropService = new DropService();

export class DropController {
  public async getActiveDrops(req: Request, res: Response) {
    try {
      const drops = await dropService.getActiveDrops();
      return res.status(200).json(drops);
    } catch (error: any) {
      return res.status(500).json({ message: error.message || 'Internal server error' });
    }
  }

  public async createDrop(req: Request, res: Response) {
    try {
      const drop = await dropService.createDrop(req.body);
      return res.status(201).json(drop);
    } catch (error: any) {
      return res.status(500).json({ message: error.message || 'Internal server error' });
    }
  }

  public async reserveItem(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { drop_id } = req.body;

      if (!userId) {
        return res.status(401).json({ message: 'User unauthorized' });
      }

      if (!drop_id) {
        return res.status(400).json({ message: 'Drop ID is required' });
      }

      const result = await reservationService.createReservation(userId, drop_id);
      return res.status(200).json(result);
    } catch (error: any) {
      const status = error.status || 500;
      return res.status(status).json({ message: error.message || 'Internal server error' });
    }
  }

  public async purchaseItem(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { reservation_id } = req.body;

      if (!userId) {
        return res.status(401).json({ message: 'User unauthorized' });
      }

      if (!reservation_id) {
        return res.status(400).json({ message: 'Reservation ID is required' });
      }

      const result = await reservationService.purchaseItem(userId, reservation_id);
      return res.status(200).json(result);
    } catch (error: any) {
      const status = error.status || 500;
      return res.status(status).json({ message: error.message || 'Internal server error' });
    }
  }
}

export const dropController = new DropController();
