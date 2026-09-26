import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { z, ZodErrorMap, ZodSchema } from 'zod';

export const arabicErrorMap: ZodErrorMap = (issue, ctx) => {
  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      if (issue.received === 'undefined') {
        return { message: 'هذا الحقل مطلوب' };
      }
      return { message: 'نوع البيانات غير صالح' };

    case z.ZodIssueCode.too_small:
      return { message: 'القيمة قصيرة جدًا' };

    case z.ZodIssueCode.too_big:
      return { message: 'القيمة طويلة جدًا' };

    case z.ZodIssueCode.invalid_string:
      return { message: 'صيغة غير صحيحة' };

    case z.ZodIssueCode.invalid_enum_value:
      return { message: 'قيمة غير مسموحة' };

    case z.ZodIssueCode.invalid_date:
      return { message: 'تاريخ غير صالح' };

    case z.ZodIssueCode.custom:
      return { message: ctx.defaultError || 'قيمة غير صالحة' };

    default:
      return { message: ctx.defaultError || 'بيانات غير صالحة' };
  }
};

z.setErrorMap(arabicErrorMap);

const ENGLISH_FALLBACK_MESSAGES: Record<string, string> = {
  'Required': 'هذا الحقل مطلوب',
  'Phone number is required': 'رقم الهاتف مطلوب',
  'WhatsApp number must be in Syrian format (e.g. 0912345678)': 'رقم الواتساب يجب أن يكون بالصيغة السورية (مثال: 0912345678)',
  'Password must not exceed 72 bytes': 'كلمة المرور يجب ألا تتجاوز 72 بايت',
};

// F4: تعريب مسارات الحقول (BUG-011)
const FIELD_NAME_MAP: Record<string, string> = {
  items: 'المواد',
  itemName: 'اسم المادة',
  quantity: 'الكمية',
  customStoreName: 'اسم المتجر المخصص',
  anyStore: 'أي متجر',
  notes: 'الملاحظات',
  preferredRunnerId: 'المندوب المفضل',
  waitForPreferred: 'انتظار المندوب المفضل',
  deliveryAddress: 'عنوان التوصيل',
  deliveryLat: 'خط العرض',
  deliveryLng: 'خط الطول',
  deliveryDesc: 'وصف العنوان',
  storeName: 'اسم المتجر',
  reason: 'السبب',
  page: 'رقم الصفحة',
  limit: 'الحد الأقصى',
  password: 'كلمة المرور',
  whatsapp: 'رقم الواتساب',
  name: 'الاسم',
  altPhone: 'الهاتف البديل',
  stars: 'التقييم',
  note: 'الملاحظة',
  address: 'العنوان',
  lat: 'خط العرض',
  lng: 'خط الطول',
  description: 'الوصف',
  id: 'المعرف',
  storeId: 'معرف المتجر',
};

function formatLocalizedPath(path: (string | number)[]): string {
  if (!path.length) return '';
  let result = '';
  for (const segment of path) {
    if (typeof segment === 'number' || /^\d+$/.test(String(segment))) {
      result += `[${segment}]`;
    } else {
      const translated = FIELD_NAME_MAP[String(segment)] ?? String(segment);
      result = result.length > 0 ? `${result}.${translated}` : translated;
    }
  }
  return result;
}

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown, _metadata: ArgumentMetadata) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const errorMessages = result.error.issues
        .map((err) => {
          const rawMessage = err.message;
          const localizedMessage = ENGLISH_FALLBACK_MESSAGES[rawMessage] ?? rawMessage;
          const path = formatLocalizedPath(err.path);
          return path ? `${path}: ${localizedMessage}` : localizedMessage;
        })
        .join('، ');
      throw new BadRequestException(errorMessages);
    }
    return result.data;
  }
}

