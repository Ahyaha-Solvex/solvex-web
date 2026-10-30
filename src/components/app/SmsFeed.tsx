'use client';

import React from 'react';
import { Card, Tag } from 'antd';
import {
  InboxOutlined,
  SendOutlined,
  WifiOutlined,
  DisconnectOutlined,
} from '@ant-design/icons';
import { useTranslations } from 'next-intl';
import type { SmsMessage } from '@/lib/data/types';
import { EmptyState } from './EmptyState';

export interface SmsFeedProps {
  messages?: SmsMessage[];
  networkOnline?: boolean;
  className?: string;
}

export function SmsFeed({
  messages = [],
  networkOnline = true,
  className = '',
}: SmsFeedProps) {
  const t = useTranslations('responder');

  return (
    <Card
      size="small"
      className={`bg-surface border-border shadow-1 ${className}`}
      title={
        <div className="flex items-center justify-between">
          <span className="font-semibold text-sm text-ink flex items-center gap-2">
            <SendOutlined className="text-brand" />
            <span>{t('smsFeedTitle')}</span>
          </span>

          <Tag
            color={networkOnline ? 'success' : 'warning'}
            className="m-0 text-xs flex items-center gap-1 font-medium"
          >
            {networkOnline ? <WifiOutlined /> : <DisconnectOutlined />}
            <span>{networkOnline ? 'Online' : 'Offline (SMS mode)'}</span>
          </Tag>
        </div>
      }
    >
      {messages.length === 0 ? (
        <EmptyState
          title="No SMS messages"
          description="Inbound blackbox alerts and dispatch notifications will appear here."
        />
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => {
            const formattedTime = new Date(msg.t).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={msg.id}
                className="p-3 rounded-lg bg-surface-2 border border-border space-y-2 text-xs"
              >
                {/* Header: Direction + Time + Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-semibold">
                    {msg.dir === 'in' ? (
                      <Tag color="cyan" className="m-0 flex items-center gap-1">
                        <InboxOutlined /> Inbound
                      </Tag>
                    ) : (
                      <Tag color="blue" className="m-0 flex items-center gap-1">
                        <SendOutlined /> Outbound
                      </Tag>
                    )}
                    <span className="font-mono text-[11px] text-muted">
                      {formattedTime}
                    </span>
                  </div>

                  {msg.delivery && (
                    <Tag
                      color={msg.delivery === 'delivered' ? 'green' : 'default'}
                      className="m-0 text-[10px]"
                    >
                      {msg.delivery}
                    </Tag>
                  )}
                </div>

                {/* Raw SMS Mono String (dir="ltr" per Hard Rule) */}
                <div
                  dir="ltr"
                  className="font-mono text-xs p-2 rounded bg-surface border border-border text-ink break-all select-all font-medium"
                >
                  {msg.raw}
                </div>

                {/* Parsed Chips */}
                {msg.parsed ? (
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <Tag color="gold" className="m-0 text-[10px]">
                      C{msg.parsed.confidence}
                    </Tag>
                    <Tag color="red" className="m-0 text-[10px]">
                      SEV: {msg.parsed.severity}
                    </Tag>
                    <Tag color="blue" className="m-0 text-[10px]">
                      OCC: {msg.parsed.occupants}
                    </Tag>
                    {msg.parsed.bloodType && (
                      <Tag color="magenta" className="m-0 text-[10px]">
                        BLOOD: {msg.parsed.bloodType}
                      </Tag>
                    )}
                  </div>
                ) : (
                  <span className="text-[10px] text-muted italic">
                    Unparsed payload
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
