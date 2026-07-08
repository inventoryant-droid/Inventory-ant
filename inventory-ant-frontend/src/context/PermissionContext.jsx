import React, { createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SubscriptionService } from '../services/subscriptionService';

const PermissionContext = createContext(null);

export function PermissionProvider({ children }) {
  // Query active subscription details (includes plan & features)
  const { data: subData, isLoading } = useQuery({
    queryKey: ['currentSubscription'],
    queryFn: SubscriptionService.getCurrentSubscription,
    retry: 1,
    staleTime: 60000, // 1 minute
  });

  const hasPermission = (featureCode) => {
    if (!subData) return false;
    
    // Admin bypasses all checks
    const userRole = localStorage.getItem('ant_role');
    if (userRole === 'admin') return true;

    // Check if the plan contains the feature
    const planFeatures = subData?.plan?.features || [];
    return planFeatures.some(f => f.feature.code === featureCode);
  };

  const getFeatureLimit = (featureCode) => {
    if (!subData) return 0;
    const planFeatures = subData?.plan?.features || [];
    const feat = planFeatures.find(f => f.feature.code === featureCode);
    return feat ? feat.limitValue : 0;
  };

  return (
    <PermissionContext.Provider value={{ hasPermission, getFeatureLimit, isLoading }}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
}
