import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';

const authService = new AuthService();

export class AuthController {
  public async register(req: Request, res: Response) {
    try {
      const result = await authService.register(req.body);
      return res.status(201).json(result);
    } catch (error: any) {
      const status = error.status || 500;
      return res.status(status).json({ message: error.message || 'Internal server error' });
    }
  }

  public async login(req: Request, res: Response) {
    try {
      const result = await authService.login(req.body);
      return res.status(200).json(result);
    } catch (error: any) {
      const status = error.status || 500;
      return res.status(status).json({ message: error.message || 'Internal server error' });
    }
  }
}

export const authController = new AuthController();
