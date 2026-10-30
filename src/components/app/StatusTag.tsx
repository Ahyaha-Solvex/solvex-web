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
      borderColor: 'var(--brand)',
      textColor: 'text-brand',
      icon: <AlertOutlined />,
      label: t('detected'),
    },
    dispatched: {
      color: '#E6F1EA',
      borderColor: '#007A41',
      textColor: 'text-brand',
      icon: <SendOutlined />,
      label: t('dispatched'),
    },
    on_scene: {
      color: '#D1E6D8',
      borderColor: '#006233',
      textColor: 'text-brand',
      icon: <EnvironmentOutlined />,
      label: t('on_scene'),
    },
    transporting: {
      color: 'var(--brand)',
      borderColor: 'var(--brand)',
      textColor: 'text-white',
      icon: <CarOutlined />,
      label: t('transporting'),
    },
    at_hospital: {
      color: '#004D28',
      borderColor: '#004D28',
      textColor: 'text-white',
      icon: <MedicineBoxOutlined />,
      label: t('at_hospital'),
    },
    closed: {
      color: 'var(--surface-2)',
      borderColor: 'var(--border)',
      textColor: 'text-muted',
      icon: <CheckCircleOutlined />,
      label: t('closed'),
    },
  }[status];

  const sizeClasses = {
    small: 'text-xs px-2 py-0.5 rounded-[4px]',
    middle: 'text-xs px-2.5 py-1 rounded-[6px] font-medium',
  }[size];

  return (
    <Tag
      style={{
        backgroundColor: disabled ? 'var(--surface-2)' : config.color,
        borderColor: disabled ? 'var(--border)' : config.borderColor,
      }}
      className={`m-0 inline-flex items-center gap-1.5 transition-all shadow-sm ${
        disabled ? 'text-muted opacity-60 cursor-not-allowed' : config.textColor
      } ${sizeClasses} ${className}`}
    >
      <span className="flex items-center">{config.icon}</span>
      <span>{config.label}</span>

      {channel && (
        <span className="inline-flex items-center gap-0.5 ps-1 border-s border-current/25 ms-0.5 text-[10px] font-mono opacity-85">
          {channel === 'data' ? <WifiOutlined /> : <MessageOutlined />}
          <span>{channel.toUpperCase()}</span>
        </span>
      )}
    </Tag>
  );
}
