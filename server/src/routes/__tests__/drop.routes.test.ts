import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../app';
import { dropService, reservationService } from '../../container';

const JWT_SECRET = process.env.JWT_SECRET || 'sneaker_drop_secret_key_12345';
const validToken = jwt.sign({ id: 'user-uuid-123' }, JWT_SECRET);

describe('Drop Routes (Feature)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/drops', () => {
    it('should return list of active drops', async () => {
      const mockDrops = [
        { id: 'drop-1', name: 'Jordan 1', price: 150, total_stock: 10, available_stock: 10 }
      ];

      const spy = jest.spyOn(dropService, 'getActiveDrops').mockResolvedValue(mockDrops as any);

      const res = await request(app).get('/api/v1/drops');

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockDrops);
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/drops/create', () => {
    it('should create a drop successfully', async () => {
      const dropData = {
        name: 'Jordan 4 Retro',
        price: 215,
        total_stock: 15,
        start_time: '2026-08-08T00:00:00.000Z'
      };

      const mockResponse = { id: 'drop-2', ...dropData, available_stock: 15 };
      const spy = jest.spyOn(dropService, 'createDrop').mockResolvedValue(mockResponse as any);

      const res = await request(app)
        .post('/api/v1/drops/create')
        .send(dropData);

      expect(res.status).toBe(201);
      expect(res.body).toEqual(mockResponse);
      expect(spy).toHaveBeenCalledWith(dropData);
    });

    it('should return 422 if create request is invalid', async () => {
      const res = await request(app)
        .post('/api/v1/drops/create')
        .send({
          name: '',
          price: -10,
          total_stock: 0,
          start_time: 'invalid-date'
        });

      expect(res.status).toBe(422);
      expect(res.body).toHaveProperty('message', 'Validation Failed');
    });
  });

  describe('POST /api/v1/drops/reserve', () => {
    const dropId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'; // valid uuid

    it('should reserve an item successfully when authorized', async () => {
      const mockResponse = {
        reservation_id: 'res-123',
        expires_at: new Date().toISOString(),
        available_stock: 9
      };

      const spy = jest.spyOn(reservationService, 'createReservation').mockResolvedValue(mockResponse as any);

      const res = await request(app)
        .post('/api/v1/drops/reserve')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ drop_id: dropId });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('reservation_id', 'res-123');
      expect(spy).toHaveBeenCalledWith('user-uuid-123', dropId);
    });

    it('should return 401 if token is not provided', async () => {
      const res = await request(app)
        .post('/api/v1/drops/reserve')
        .send({ drop_id: dropId });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('message', 'Authentication required: Token not provided');
    });
  });

  describe('POST /api/v1/drops/purchase', () => {
    const reservationId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'; // valid uuid

    it('should complete purchase successfully when authorized', async () => {
      const mockResponse = {
        id: 'purchase-123',
        user_id: 'user-uuid-123',
        drop_id: 'drop-123',
        reservation_id: reservationId,
        amount_paid: 150
      };

      const spy = jest.spyOn(reservationService, 'purchaseItem').mockResolvedValue(mockResponse as any);

      const res = await request(app)
        .post('/api/v1/drops/purchase')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ reservation_id: reservationId });

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockResponse);
      expect(spy).toHaveBeenCalledWith('user-uuid-123', reservationId);
    });
  });
});
