import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PermissionProvider } from './PermissionContext';

// Instantiate a single global QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

export default function AppProviders({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <PermissionProvider>
        {children}
      </PermissionProvider>
    </QueryClientProvider>
  );
}
