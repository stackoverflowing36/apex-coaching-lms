'use client';

import { useCallback } from 'react';
import { toast } from 'sonner';

/**
 * Hook to simulate CRUD operations with toast notifications.
 * Wraps any action with a loading delay and success/error toasts
 * styled as floating cards.
 */
export function useToastAction() {
  const execute = useCallback(
    async ({
      action,
      loadingMessage,
      successMessage,
      errorMessage,
      delay = 800,
    }: {
      action?: () => void | Promise<void>;
      loadingMessage?: string;
      successMessage: string;
      errorMessage?: string;
      delay?: number;
    }) => {
      const toastId = loadingMessage
        ? toast.loading(loadingMessage, {
            description: 'Please wait...',
          })
        : undefined;

      try {
        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, delay));

        if (action) {
          await action();
        }

        if (toastId) {
          toast.success(successMessage, {
            id: toastId,
            description: 'Changes saved successfully.',
          });
        } else {
          toast.success(successMessage, {
            description: 'Changes saved successfully.',
          });
        }
      } catch {
        const msg = errorMessage || 'Something went wrong. Please try again.';
        if (toastId) {
          toast.error(msg, { id: toastId });
        } else {
          toast.error(msg);
        }
      }
    },
    []
  );

  return { execute };
}
