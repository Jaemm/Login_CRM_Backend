import { SetMetadata } from '@nestjs/common';

const ROLES_KEY = process.env.ROLES_KEY;

export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
