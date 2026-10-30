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
      color: '#E6F1EA',
      borderColor: '#006233',
      textColor: '#004D28',
      icon: <AlertOutlined />,
      label: t('detected'),
    },
    dispatched: {
      color: '#E6F1EA',
      borderColor: '#007A41',
      textColor: '#004D28',
      icon: <SendOutlined />,
      label: t('dispatched'),
    },
    on_scene: {
      color: '#D1E6D8',
      borderColor: '#006233',
      textColor: '#004D28',
      icon: <EnvironmentOutlined />,
      label: t('on_scene'),
    },
    transporting: {
      color: '#006233',
      borderColor: '#004D28',
      textColor: '#FFFFFF',
      icon: <CarOutlined />,
      label: t('transporting'),
    },
    at_hospital: {
      color: '#004D28',
      borderColor: '#00331A',
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
    small: 'text-[11px] px-2 py-0.5 rounded-[4px] gap-1.5 h-6',
    middle: 'text-xs px-2.5 py-1 rounded-[6px] font-semibold gap-1.5 h-7',
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
