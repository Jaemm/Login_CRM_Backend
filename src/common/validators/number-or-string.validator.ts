import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { ValueTransformer } from 'typeorm';

@ValidatorConstraint({ name: 'isNumberOrString', async: false })
export class IsNumberOrString implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === 'number' || typeof value === 'string';
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} must be a number or a string`;
  }
}

export class StringToNumberTransformer implements ValueTransformer {
  to(value: number | null): number | null {
    return value;
  }

  from(value: string | null): number | null {
    return value != null ? Number(value) : null;
  }
}

export class BooleanTransformer implements ValueTransformer {
  to(value: boolean | null): boolean | null {
    return value;
  }

  from(value: boolean | null): boolean | null {
    return value != null ? value : null;
  }
}
