export interface ISingleJwt {
  secret: string;
  time: number;
}

export interface IAccessJwt {
  secret: string;

  time: number;
}

export interface IJwt {
  access: IAccessJwt;
  confirmation: ISingleJwt;
  resetPassword: ISingleJwt;
  refresh: ISingleJwt;
}
