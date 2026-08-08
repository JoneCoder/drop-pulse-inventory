import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { RegisterRequestDto, LoginRequestDto, AuthResponseDto } from '../dtos/auth.dto';

const JWT_SECRET = process.env.JWT_SECRET || 'sneaker_drop_secret_key_12345';

export class AuthService {
  /**
   * Register a new user
   */
  public async register(dto: RegisterRequestDto): Promise<AuthResponseDto> {
    const existingUser = await User.findOne({
      where: { email: dto.email }
    });

    if (existingUser) {
      throw { status: 409, message: 'Email already registered' };
    }

    const existingUsername = await User.findOne({
      where: { username: dto.username }
    });

    if (existingUsername) {
      throw { status: 409, message: 'Username already taken' };
    }

    const passwordHash = await bcrypt.hash(dto.password || 'default_pass', 10);

    const user = await User.create({
      username: dto.username,
      email: dto.email,
      password_hash: passwordHash
    });

    const token = this.generateToken(user.id);

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    };
  }

  /**
   * Log in an existing user
   */
  public async login(dto: LoginRequestDto): Promise<AuthResponseDto> {
    const user = await User.findOne({
      where: { email: dto.email }
    });

    if (!user) {
      throw { status: 401, message: 'Invalid email or password' };
    }

    const isMatch = await bcrypt.compare(dto.password || 'default_pass', user.password_hash);
    if (!isMatch) {
      throw { status: 401, message: 'Invalid email or password' };
    }

    const token = this.generateToken(user.id);

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    };
  }

  /**
   * Generate JWT
   */
  private generateToken(userId: string): string {
    return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '7d' });
  }
}
