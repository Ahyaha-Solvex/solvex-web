'use client';

import React, { useState } from 'react';
import { Input, InputNumber, Modal, Radio } from 'antd';
import { useTranslations } from 'next-intl';
import type { PhoneReport } from '@/lib/data/types';

const QUESTIONS = ['conscious', 'breathing', 'bleeding', 'trapped'] as const;
const BLANK: PhoneReport = { roadLabel: '', victims: 1, conscious: true, breathing: true, bleeding: false, trapped: false };

export interface NewCallModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (report: PhoneReport) => void;
}

export function NewCallModal({ open, onClose, onSubmit }: NewCallModalProps) {
  const t = useTranslations('responder.call');
  const [report, setReport] = useState<PhoneReport>(BLANK);

  const submit = () => {
    onSubmit(report);
    setReport(BLANK);
  };

  return (
    <Modal
      open={open}
      title={t('title')}
      okText={t('submit')}
      cancelText={t('cancel')}
      okButtonProps={{ disabled: !report.roadLabel.trim() }}
      onOk={submit}
      onCancel={onClose}
      destroyOnHidden
    >
      <div className="space-y-4 pt-2">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_7rem] gap-3">
          <label className="block text-xs font-semibold text-ink">
            {t('location')}
            <Input
              className="mt-1.5"
              value={report.roadLabel}
              placeholder={t('locationHint')}
              onChange={(e) => setReport({ ...report, roadLabel: e.target.value })}
            />
          </label>
          <label className="block text-xs font-semibold text-ink">
            {t('victims')}
            <InputNumber
              className="mt-1.5 w-full"
              min={1}
              max={9}
              value={report.victims}
              onChange={(victims) => setReport({ ...report, victims: victims ?? 1 })}
            />
          </label>
        </div>

        <div className="rounded-lg border border-border bg-surface-2/60 divide-y divide-border">
          {QUESTIONS.map((question) => (
            <div
              key={question}
              className="flex items-center justify-between gap-4 px-3.5 py-2.5 text-sm font-medium text-ink"
            >
              <span>{t(`questions.${question}`)}</span>
              <Radio.Group
                size="small"
                optionType="button"
                buttonStyle="solid"
                value={report[question]}
                onChange={(e) => setReport({ ...report, [question]: e.target.value as boolean })}
                options={[
                  { label: t('yes'), value: true },
                  { label: t('no'), value: false },
                ]}
              />
            </div>
          ))}
        </div>

        <p className="text-xs text-muted m-0">{t('note')}</p>
      </div>
    </Modal>
  );
}
