'use client';

import React from 'react';
import { Card } from 'antd';
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
  bare?: boolean;
  className?: string;
}

export function SmsFeed({
  messages = [],
  networkOnline = true,
  bare = false,
  className = '',
}: SmsFeedProps) {
  const t = useTranslations('responder');

  const content =
    messages.length === 0 ? (
      <EmptyState
        title={t('smsFeedTitle')}
        description={t('smsOnly')}
      />
    ) : (
      <div className="space-y-2.5">
        {messages.map((msg) => {
          const formattedTime = new Date(msg.t).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          });

          return (
            <div
              key={msg.id}
              className="p-3 rounded-md bg-surface-2/80 border border-border space-y-2 text-xs"
            >
              {/* Header: Direction + Time + Status */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-semibold">
                  {msg.dir === 'in' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-brand-subtle border border-brand/30 text-brand text-[11px] font-semibold">
                      <InboxOutlined /> IN
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-surface border border-border-strong text-ink-2 text-[11px] font-semibold">
                      <SendOutlined /> OUT
                    </span>
                  )}
                  <span
                    className="font-mono text-[11px] text-muted tabular-nums"
                    dir="ltr"
                  >
                    {formattedTime}
                  </span>
                </div>

                {msg.delivery && (
                  <span
                    className={`px-2 py-0.5 rounded-sm border text-[10px] font-mono font-medium ${
                      msg.delivery === 'delivered'
                        ? 'bg-brand-subtle border-brand/25 text-brand'
                        : 'bg-surface border-border text-muted'
                    }`}
                  >
                    {msg.delivery}
                  </span>
                )}
              </div>

              {/* Raw SMS Mono String (dir="ltr" per Hard Rule) */}
              <div
                dir="ltr"
                className="font-mono text-xs p-2.5 rounded-sm bg-surface border border-border text-ink break-all select-all font-medium leading-relaxed"
              >
                {msg.raw}
              </div>

              {/* Parsed Chips */}
              {msg.parsed ? (
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5" dir="ltr">
                  <span className="px-2 py-0.5 rounded-sm bg-surface border border-border font-mono text-[10px] font-semibold text-ink-2">
                    C{msg.parsed.confidence}
                  </span>
                  <span className="px-2 py-0.5 rounded-sm bg-sev-extreme-subtle border border-sev-extreme/30 font-mono text-[10px] font-semibold text-sev-extreme">
                    SEV:{msg.parsed.severity}
                  </span>
                  <span className="px-2 py-0.5 rounded-sm bg-surface border border-border font-mono text-[10px] font-semibold text-ink-2">
                    OCC:{msg.parsed.occupants}
                  </span>
                  {msg.parsed.bloodType && (
                    <span className="px-2 py-0.5 rounded-sm bg-sev-extreme-subtle border border-sev-extreme/30 font-mono text-[10px] font-bold text-sev-extreme">
                      {msg.parsed.bloodType}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-[11px] text-muted">
                  SMS
                </span>
              )}
            </div>
          );
        })}
      </div>
    );

  if (bare) {
    return <div className={`pt-1 ${className}`}>{content}</div>;
  }

  return (
    <Card
      size="small"
      className={`bg-surface border-border shadow-1 ${className}`}
      title={
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-sm text-ink flex items-center gap-2">
            <SendOutlined className="text-brand" />
            <span>{t('smsFeedTitle')}</span>
          </span>

          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-medium ${
              networkOnline
                ? 'bg-brand-subtle border-brand/30 text-brand'
                : 'bg-surface-2 border-sev-medium text-ink'
            }`}
          >
            {networkOnline ? <WifiOutlined /> : <DisconnectOutlined />}
            <span>{networkOnline ? 'Online' : 'SMS'}</span>
          </span>
        </div>
      }
    >
      {content}
    </Card>
  );
}
