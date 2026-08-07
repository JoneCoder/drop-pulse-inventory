import request from 'supertest';
import app from '../../app';
import { authService } from '../../container';

describe('Auth Routes (Feature)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully and return 201', async () => {
      const mockResponse = {
        token: 'token123',
        user: { id: 'user1', username: 'testuser', email: 'test@example.com' }
      };

      const spy = jest.spyOn(authService, 'register').mockResolvedValue(mockResponse);

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(201);
      expect(res.body).toEqual(mockResponse);
      expect(spy).toHaveBeenCalledWith({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      });
    });

    it('should return validation error if input is invalid', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: '',
          email: 'not-an-email',
          password: '12'
        });

      expect(res.status).toBe(422);
      expect(res.body).toHaveProperty('message', 'Validation Failed');
      expect(res.body).toHaveProperty('errors');
      expect(Array.isArray(res.body.errors)).toBe(true);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully and return 200', async () => {
      const mockResponse = {
        token: 'token123',
        user: { id: 'user1', username: 'testuser', email: 'test@example.com' }
      };

      const spy = jest.spyOn(authService, 'login').mockResolvedValue(mockResponse);

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockResponse);
      expect(spy).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });
    });

    it('should return 422 if credentials are blank or invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: '',
          password: ''
        });

      expect(res.status).toBe(422);
      expect(res.body).toHaveProperty('message', 'Validation Failed');
    });
  });
});
