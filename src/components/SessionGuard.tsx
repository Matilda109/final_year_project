"use client";

import React from 'react';
import tabSessionManager from '@/lib/tabSessionManager';

interface SessionGuardProps {
  children: React.ReactNode;
}

export default function SessionGuard({ children }: SessionGuardProps) {
  // No session detection logic - just render children
  return <>{children}</>;
} 