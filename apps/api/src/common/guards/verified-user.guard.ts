import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class VerifiedUserGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request['user'];

    if (!user || !user.status) {
      throw new ForbiddenException('No user status found');
    }

    if (user.status !== 'VERIFIED') {
      throw new ForbiddenException('الحساب لم يُفعّل بعد');
    }

    return true;
  }
}
