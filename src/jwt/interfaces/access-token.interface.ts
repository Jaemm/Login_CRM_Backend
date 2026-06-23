import { ITokenBase } from './token.interface';

export interface IAccessPayload {
  id: number;
  role: string;
  is_hair_skin: boolean | null;
  app_id: number | null;
}

export interface IAccessToken extends IAccessPayload, ITokenBase {}
