import { useState } from 'react';
import api from '../api/client';
import type {
  CreateReceiptResponse,
  PresignedUrlResponse,
} from '@fawrun/shared-types';

interface ReceiptUploaderProps {
  orderId: string;
  storeId: string;
  onUploadComplete?: (receipt: CreateReceiptResponse) => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const VALID_TYPES = ['image/jpeg', 'image/png'];

export function ReceiptUploader({
  orderId,
  storeId,
  onUploadComplete,
}: ReceiptUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!VALID_TYPES.includes(file.type)) {
      setError('Only JPG and PNG images are allowed');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError(`File exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
      return;
    }

    setError(null);
    setPreview(URL.createObjectURL(file));
    setIsUploading(true);

    try {
      const fileType = file.type === 'image/jpeg' ? 'jpg' : 'png';

      const presignedRes = await api.post<PresignedUrlResponse>(
        `/runner/orders/${orderId}/stores/${storeId}/receipts/presigned-url`,
        { fileType, fileSize: file.size },
      );

      const { presignedUrl, r2Key } = presignedRes.data;

      await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      const createRes = await api.post<CreateReceiptResponse>(
        `/runner/orders/${orderId}/stores/${storeId}/receipts`,
        { r2Key },
      );

      onUploadComplete?.(createRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
      setPreview(null);
    }
  };

  return (
    <div className="receipt-uploader">
      <label className="btn btn-outline btn-small">
        {isUploading ? 'جارٍ الرفع...' : 'رفع إيصال'}
        <input
          type="file"
          accept="image/jpeg,image/png"
          onChange={handleFileSelect}
          disabled={isUploading}
          style={{ display: 'none' }}
        />
      </label>
      {preview && (
        <img
          src={preview}
          alt="Receipt preview"
          className="receipt-thumb"
        />
      )}
      {error && <div className="error-msg">{error}</div>}
    </div>
  );
}
