'use client';

import React from 'react';
import { ConfigProvider } from 'antd';
import { antdTheme } from '@/lib/antdTheme';

export function MedicalTheme({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider theme={antdTheme}>
      <div className="theme-medical">{children}</div>
    </ConfigProvider>
  );
}
