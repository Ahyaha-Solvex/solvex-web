import { describe, it, expect } from 'vitest';
import { PRODUCT_NAME } from '@/config/brand';
import { antdTheme } from '@/lib/antdTheme';

describe('Brand & Theme Configuration', () => {
  it('exports correct product name', () => {
    expect(PRODUCT_NAME).toBe('SolveX Response');
  });

  it('matches brand primary color from DESIGN.md', () => {
    expect(antdTheme.token?.colorPrimary).toBe('#006233');
    expect(antdTheme.token?.colorSuccess).toBe('#2A7F6F');
    expect(antdTheme.token?.colorWarning).toBe('#D9A400');
    expect(antdTheme.token?.colorError).toBe('#D21034');
    expect(antdTheme.token?.colorBgLayout).toBe('#FAF8F3');
  });

  it('configures Ant component radii', () => {
    expect(antdTheme.token?.borderRadius).toBe(10);
    expect(antdTheme.token?.borderRadiusLG).toBe(14);
  });
});
