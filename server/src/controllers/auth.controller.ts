import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';

export class AuthController {
  constructor(private authService: AuthService) {}

  public register = async (req: Request, res: Response) => {
    try {
      const result = await this.authService.register(req.body);
      return res.status(201).json(result);
    } catch (error: any) {
      const status = error.status || 500;
      return res.status(status).json({ message: error.message || 'Internal server error' });
    }
  };

  public login = async (req: Request, res: Response) => {
    try {
      const result = await this.authService.login(req.body);
      return res.status(200).json(result);
    } catch (error: any) {
      const status = error.status || 500;
      return res.status(status).json({ message: error.message || 'Internal server error' });
    }
  };
}
