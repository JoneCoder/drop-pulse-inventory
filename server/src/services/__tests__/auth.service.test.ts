import { AuthService } from '../auth.service';
import { User } from '../../models/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

jest.mock('../../models/User');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const dto = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      // Mock User.findOne to return null (no existing user)
      (User.findOne as jest.Mock).mockResolvedValue(null);

      // Mock bcrypt.hash to return a hashed password
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');

      // Mock User.create to return the created user object
      const createdUser = {
        id: 'user-uuid-123',
        username: dto.username,
        email: dto.email,
        password_hash: 'hashed_password'
      };
      (User.create as jest.Mock).mockResolvedValue(createdUser);

      // Mock jwt.sign to return a token
      (jwt.sign as jest.Mock).mockReturnValue('jwt-token-123');

      const result = await authService.register(dto);

      expect(User.findOne).toHaveBeenCalledWith({ where: { email: dto.email } });
      expect(User.findOne).toHaveBeenCalledWith({ where: { username: dto.username } });
      expect(bcrypt.hash).toHaveBeenCalledWith(dto.password, 10);
      expect(User.create).toHaveBeenCalledWith({
        username: dto.username,
        email: dto.email,
        password_hash: 'hashed_password'
      });
      expect(result).toEqual({
        token: 'jwt-token-123',
        user: {
          id: 'user-uuid-123',
          username: dto.username,
          email: dto.email
        }
      });
    });

    it('should throw conflict error if email is already registered', async () => {
      const dto = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      // Mock User.findOne to return an existing user on the first call (email check)
      (User.findOne as jest.Mock).mockResolvedValueOnce({ id: 'existing-id' });

      await expect(authService.register(dto)).rejects.toEqual({
        status: 409,
        message: 'Email already registered'
      });

      expect(User.findOne).toHaveBeenCalledWith({ where: { email: dto.email } });
      expect(User.create).not.toHaveBeenCalled();
    });

    it('should throw conflict error if username is already taken', async () => {
      const dto = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      // Mock User.findOne to return null for email check, then return existing user for username check
      (User.findOne as jest.Mock)
        .mockResolvedValueOnce(null) // email check
        .mockResolvedValueOnce({ id: 'existing-id' }); // username check

      await expect(authService.register(dto)).rejects.toEqual({
        status: 409,
        message: 'Username already taken'
      });

      expect(User.findOne).toHaveBeenCalledWith({ where: { email: dto.email } });
      expect(User.findOne).toHaveBeenCalledWith({ where: { username: dto.username } });
      expect(User.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'password123'
      };

      const mockUser = {
        id: 'user-uuid-123',
        username: 'testuser',
        email: dto.email,
        password_hash: 'hashed_password'
      };

      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockReturnValue('jwt-token-123');

      const result = await authService.login(dto);

      expect(User.findOne).toHaveBeenCalledWith({ where: { email: dto.email } });
      expect(bcrypt.compare).toHaveBeenCalledWith(dto.password, 'hashed_password');
      expect(result).toEqual({
        token: 'jwt-token-123',
        user: {
          id: 'user-uuid-123',
          username: 'testuser',
          email: dto.email
        }
      });
    });

    it('should throw unauthorized error if user is not found', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'password123'
      };

      (User.findOne as jest.Mock).mockResolvedValue(null);

      await expect(authService.login(dto)).rejects.toEqual({
        status: 401,
        message: 'Invalid email or password'
      });
    });

    it('should throw unauthorized error if password does not match', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'password123'
      };

      const mockUser = {
        id: 'user-uuid-123',
        username: 'testuser',
        email: dto.email,
        password_hash: 'hashed_password'
      };

      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.login(dto)).rejects.toEqual({
        status: 401,
        message: 'Invalid email or password'
      });
    });
  });
});
