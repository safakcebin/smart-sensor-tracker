export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  companyId?: string;
  iat?: number;
  exp?: number;
}
