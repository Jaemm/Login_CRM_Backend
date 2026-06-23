export interface ITokenBase {
  iat: number;
  exp: number;
  iss: string;
  aud: string;
  sub: string;
}

export interface SocialInterface {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}
