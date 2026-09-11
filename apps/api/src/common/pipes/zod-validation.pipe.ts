import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { ZodSchema } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown, _metadata: ArgumentMetadata) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const errorMessages = result.error.errors
        .map((err) => `${err.path.join('.')} - ${err.message}`)
        .join(', ');
      throw new BadRequestException(errorMessages);
    }
    return result.data;
  }
}
