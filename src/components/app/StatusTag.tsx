'use client';

import React from 'react';
import { Tag } from 'antd';
import {
  AlertOutlined,
  SendOutlined,
  EnvironmentOutlined,
  CarOutlined,
  MedicineBoxOutlined,
  CheckCircleOutlined,
  WifiOutlined,
  MessageOutlined,
} from '@ant-design/icons';
import { useTranslations } from 'next-intl';
import type { LifecycleStatus, Channel } from '@/lib/data/types';

export interface StatusTagProps {
  status: LifecycleStatus;
  channel?: Channel;
  size?: 'small' | 'middle';
  disabled?: boolean;
  className?: string;
}

export function StatusTag({
  status,
  channel,
  size = 'middle',
  disabled = false,
  className = '',
}: StatusTagProps) {
  const t = useTranslations('status');

  const config = {
    detected: {
      color: 'var(--brand-subtle)',
      borderColor: 'var(--brand)',
      textColor: 'var(--brand-press)',
      icon: <AlertOutlined />,
      label: t('detected'),
    },
    dispatched: {
      color: 'var(--brand-subtle)',
      borderColor: 'var(--brand-hover)',
      textColor: 'var(--brand-press)',
      icon: <SendOutlined />,
      label: t('dispatched'),
    },
    on_scene: {
      color: 'var(--brand-subtle)',
      borderColor: 'var(--brand)',
      textColor: 'var(--brand-press)',
      icon: <EnvironmentOutlined />,
      label: t('on_scene'),
    },
    transporting: {
      color: 'var(--brand)',
      borderColor: 'var(--brand-press)',
      textColor: '#FFFFFF',
      icon: <CarOutlined />,
      label: t('transporting'),
    },
    at_hospital: {
      color: 'var(--brand-press)',
      borderColor: 'var(--brand-press)',
      textColor: '#FFFFFF',
      icon: <MedicineBoxOutlined />,
      label: t('at_hospital'),
    },
    closed: {
      color: 'var(--surface-2)',
      borderColor: 'var(--border)',
      textColor: 'var(--muted)',
      icon: <CheckCircleOutlined />,
      label: t('closed'),
    },
  }[status];

  const sizeClasses = {
    small: 'text-xs px-2.5 py-1 min-h-[24px] rounded-sm gap-1.5 font-medium',
    middle: 'text-xs px-3 py-1.5 min-h-[32px] rounded-md font-semibold gap-2',
  }[size];

  const effectiveTextColor = disabled ? 'var(--muted)' : config.textColor;

  return (
    <Tag
      style={{
        backgroundColor: disabled ? 'var(--surface-2)' : config.color,
        borderColor: disabled ? 'var(--border)' : config.borderColor,
        color: effectiveTextColor,
      }}
      className={`m-0 inline-flex items-center transition-all shadow-xs select-none whitespace-nowrap ${
        disabled ? 'opacity-60 cursor-not-allowed' : ''
      } ${sizeClasses} ${className}`}
    >
      <span className="inline-flex items-center justify-center shrink-0 text-[1.1em]">
        {config.icon}
      </span>
      <span className="leading-none">{config.label}</span>

      {channel && (
        <span
          className={`inline-flex items-center gap-1 ms-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium leading-none ${
            status === 'transporting' || status === 'at_hospital'
              ? 'bg-white/20 text-white'
              : 'bg-black/8 text-ink-2'
          }`}
        >
          {channel === 'data' ? <WifiOutlined /> : <MessageOutlined />}
          <span>{channel.toUpperCase()}</span>
        </span>
      )}
    </Tag>
  );
}
