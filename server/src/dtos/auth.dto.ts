export interface RegisterRequestDto {
  username: string;
  email: string;
  password?: string;
}

export interface LoginRequestDto {
  email: string;
  password?: string;
}

export interface UserResponseDto {
  id: string;
  username: string;
  email: string;
}

export interface AuthResponseDto {
  token: string;
  user: UserResponseDto;
}
