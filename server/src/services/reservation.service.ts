import { Op } from 'sequelize';
import { sequelize } from '../config/db';
import { MerchDrop, Reservation, Purchase, User } from '../models';
import { broadcastStockUpdate, broadcastPurchaseCompleted } from '../socket';
import { ReserveDropResponseDto } from '../dtos/drop.dto';

export class ReservationService {
  constructor() {
    // Start periodic background job to reclaim expired reservations (e.g. every 5 seconds)
    if (process.env.NODE_ENV !== 'test') {
      this.startExpirationScheduler(5000);
    }
  }

  /**
   * Reserve an item inside an isolated ACID transaction using pessimistic lock (SELECT FOR UPDATE)
   */
  public async createReservation(userId: string, dropId: string): Promise<ReserveDropResponseDto> {
    const transaction = await sequelize.transaction();

    try {
      // 1. Acquire exclusive lock on the sneaker drop row
      const drop = await MerchDrop.findByPk(dropId, {
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!drop) {
        throw { status: 404, message: 'Merch drop not found' };
      }

      // Check if drop has started
      const now = new Date();
      if (now < new Date(drop.start_time)) {
        throw { status: 400, message: 'Sneaker drop has not started yet' };
      }

      // Check if stock is available
      if (drop.available_stock <= 0) {
        throw { status: 409, message: 'Sold out! No inventory remaining.' };
      }

      // 2. Safely decrement available stock
      drop.available_stock -= 1;
      await drop.save({ transaction });

      // 3. Create Reservation record with a 60-second hold duration
      const expiresAt = new Date(Date.now() + 60 * 1000);
      const reservation = await Reservation.create(
        {
          user_id: userId,
          drop_id: drop.id,
          status: 'PENDING',
          expires_at: expiresAt
        },
        { transaction }
      );

      // Commit the transaction - this releases the database lock
      await transaction.commit();

      // 4. Notify all connected web clients in real-time about the stock change
      broadcastStockUpdate(drop.id, drop.available_stock);

      // 5. Schedule in-memory immediate expiration fallback
      this.scheduleExpiration(reservation.id, 60 * 1000);

      return {
        reservation_id: reservation.id,
        expires_at: expiresAt,
        available_stock: drop.available_stock
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Complete the purchase of a reserved item transactionally
   */
  public async purchaseItem(userId: string, reservationId: string): Promise<Purchase> {
    const transaction = await sequelize.transaction();

    try {
      // 1. Lock and retrieve the reservation
      const reservation = await Reservation.findByPk(reservationId, {
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!reservation) {
        throw { status: 404, message: 'Reservation not found' };
      }

      if (reservation.user_id !== userId) {
        throw { status: 403, message: 'Access denied: Reservation belongs to another user' };
      }

      if (reservation.status !== 'PENDING') {
        throw { status: 400, message: `Reservation cannot be completed because status is ${reservation.status}` };
      }

      // Check if reservation expired
      if (new Date() > new Date(reservation.expires_at)) {
        throw { status: 400, message: 'Reservation hold has expired. Item returned to inventory.' };
      }

      // 2. Fetch drop details to determine transaction price
      const drop = await MerchDrop.findByPk(reservation.drop_id, { transaction });
      if (!drop) {
        throw { status: 404, message: 'Product drop not found' };
      }

      // 3. Mark reservation as COMPLETED
      reservation.status = 'COMPLETED';
      await reservation.save({ transaction });

      // 4. Create confirmed Purchase record
      const purchase = await Purchase.create(
        {
          user_id: userId,
          drop_id: reservation.drop_id,
          reservation_id: reservation.id,
          amount_paid: drop.price
        },
        { transaction }
      );

      // Commit transaction
      await transaction.commit();

      // 5. Fetch user profile to broadcast their name
      const user = await User.findByPk(userId);
      if (user) {
        broadcastPurchaseCompleted(drop.id, user.username);
      }

      return purchase;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Reverts expired reservations back to inventory pool transactionally
   */
  public async expireReservation(reservationId: string): Promise<void> {
    const transaction = await sequelize.transaction();

    try {
      const reservation = await Reservation.findByPk(reservationId, {
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (reservation && reservation.status === 'PENDING') {
        // Change status to EXPIRED
        reservation.status = 'EXPIRED';
        await reservation.save({ transaction });

        // Acquire lock and increment drop stock
        const drop = await MerchDrop.findByPk(reservation.drop_id, {
          transaction,
          lock: transaction.LOCK.UPDATE
        });

        if (drop) {
          drop.available_stock += 1;
          await drop.save({ transaction });
          await transaction.commit();

          // Broadcast stock update to WebSockets
          broadcastStockUpdate(drop.id, drop.available_stock);
        } else {
          await transaction.rollback();
        }
      } else {
        await transaction.rollback();
      }
    } catch (error) {
      await transaction.rollback();
      console.error(`[Error] Reverting expired reservation ${reservationId}:`, error);
    }
  }

  /**
   * Schedule timer for reservation cleanup
   */
  private scheduleExpiration(reservationId: string, delayMs: number) {
    setTimeout(() => {
      this.expireReservation(reservationId);
    }, delayMs);
  }

  /**
   * Periodically queries the database for orphan expired reservations
   */
  private startExpirationScheduler(intervalMs: number) {
    setInterval(async () => {
      try {
        const expiredReservations = await Reservation.findAll({
          where: {
            status: 'PENDING',
            expires_at: {
              [Op.lt]: new Date()
            }
          }
        });

        for (const res of expiredReservations) {
          console.log(`[Scheduler] Cleaning up expired reservation: ${res.id}`);
          await this.expireReservation(res.id);
        }
      } catch (error) {
        console.error('[Scheduler Exception] Error executing expiration checks:', error);
      }
    }, intervalMs);
  }
}
