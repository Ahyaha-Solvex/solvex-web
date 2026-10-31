'use client';

import React from 'react';
import { ConfigProvider } from 'antd';

// Clinical blue for the hospital side only; the rest of the app keeps the flag green.
const medicalTheme = {
  token: {
    colorPrimary: '#0B6BAF',
    colorInfo: '#0B6BAF',
    colorBgLayout: '#F3F7FB',
    colorBorder: '#DCE5EE',
    colorBorderSecondary: '#E7EEF5',
    colorText: '#0F1F2E',
    colorTextSecondary: '#5A6D80',
    boxShadow: '0 4px 16px rgba(15,31,46,.08)',
  },
  components: {
    Button: {
      colorPrimary: '#0B6BAF',
      colorPrimaryHover: '#0E7DC9',
      colorPrimaryActive: '#08548A',
      defaultColor: '#0F1F2E',
      defaultBorderColor: '#C6D4E1',
      defaultHoverBg: '#EDF3F9',
      defaultHoverColor: '#0F1F2E',
      defaultHoverBorderColor: '#0B6BAF',
      defaultActiveBg: '#E3EFF9',
      defaultActiveColor: '#08548A',
      defaultActiveBorderColor: '#0B6BAF',
      primaryShadow: '0 2px 4px rgba(11, 107, 175, 0.2)',
    },
    Card: { boxShadowTertiary: '0 1px 2px rgba(15,31,46,.06)' },
    Steps: { colorPrimary: '#0B6BAF' },
    Segmented: { itemSelectedBg: '#FFFFFF', trackBg: '#E7EEF5' },
  },
};

export function MedicalTheme({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider theme={medicalTheme}>
      <div className="theme-medical">{children}</div>
    </ConfigProvider>
  );
}
