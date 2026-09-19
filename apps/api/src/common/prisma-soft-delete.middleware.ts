import { PrismaClient } from '@prisma/client';

export function applySoftDeleteMiddleware(prisma: PrismaClient) {
  prisma.$use(async (params, next) => {
    if (params.model === 'OrderStore') {
      const findActions = [
        'findFirst',
        'findMany',
        'findUnique',
        'findUniqueOrThrow',
        'findFirstOrThrow',
      ];
      if (findActions.includes(params.action)) {
        const where = params.args.where || {};
        if (!where.includeDeleted) {
          params.args.where = {
            ...where,
            isDeleted: false,
          };
        } else {
          delete where.includeDeleted;
          params.args.where = where;
        }
      }
    }
    return next(params);
  });
}