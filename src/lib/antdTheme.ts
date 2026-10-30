import { theme, type ThemeConfig } from 'antd';

export const antdTheme: ThemeConfig = {
  algorithm: theme.defaultAlgorithm,
  token: {
    colorPrimary: '#006233',
    colorInfo: '#006233',
    colorSuccess: '#2A7F6F',
    colorWarning: '#D9A400',
    colorError: '#D21034',
    colorBgLayout: '#FAF8F3',
    colorBgContainer: '#FFFFFF',
    colorBorder: '#E6E1D5',
    colorBorderSecondary: '#EFEBE0',
    colorText: '#14201A',
    colorTextSecondary: '#5C675F',
    borderRadius: 10,
    borderRadiusLG: 14,
    fontSize: 14,
    fontFamily: 'var(--font-sans)',
    boxShadow: '0 4px 16px rgba(20,32,26,.08)',
  },
  components: {
    Button: { controlHeight: 38, primaryShadow: 'none', defaultShadow: 'none', fontWeight: 500 },
    Card: { borderRadiusLG: 14, boxShadowTertiary: '0 1px 2px rgba(20,32,26,.06)' },
    Table: { headerBg: '#F3F0E8', headerColor: '#3B4740', borderColor: '#E6E1D5' },
    Tag: { borderRadiusSM: 6 },
    Layout: { headerBg: 'transparent', bodyBg: '#FAF8F3' },
  },
};
