import { useCallback, useEffect, useState } from "react";

export function useImagePreviewUpload() {
  const [previewUploadUrl, setPreviewUploadUrl] = useState<string | null>(null);
  const [previewUploadName, setPreviewUploadName] = useState<string | null>(null);

  const clearPreviewUpload = useCallback(() => {
    setPreviewUploadUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      setPreviewUploadName(null);
      return null;
    });
  }, []);

  const setPreviewUploadFile = useCallback((file: File | null) => {
    setPreviewUploadUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return file ? URL.createObjectURL(file) : null;
    });
    setPreviewUploadName(file ? file.name : null);
  }, []);

  useEffect(
    () => () => {
      if (previewUploadUrl) URL.revokeObjectURL(previewUploadUrl);
    },
    [previewUploadUrl]
  );

  return {
    previewUploadUrl,
    previewUploadName,
    clearPreviewUpload,
    setPreviewUploadFile,
  };
}
