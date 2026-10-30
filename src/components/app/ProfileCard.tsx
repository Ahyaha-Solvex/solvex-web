'use client';

import React from 'react';
import { Card, Descriptions, Tag, Skeleton } from 'antd';
import {
  UserOutlined,
  PhoneOutlined,
  AlertOutlined,
  MedicineBoxOutlined,
} from '@ant-design/icons';
import type { Profile } from '@/lib/data/types';
import { EmptyState } from './EmptyState';

export interface ProfileCardProps {
  profile?: Profile;
  label?: string;
  loading?: boolean;
  className?: string;
}

export function ProfileCard({
  profile,
  label = 'Patient A',
  loading = false,
  className = '',
}: ProfileCardProps) {

  if (loading) {
    return (
      <Card size="small" className={`bg-surface border-border shadow-1 ${className}`}>
        <Skeleton active avatar paragraph={{ rows: 4 }} />
      </Card>
    );
  }

  if (!profile) {
    return (
      <EmptyState
        variant="patients"
        title="No patient data"
        description="Profile information not received from emergency blackbox."
        className={className}
      />
    );
  }

  const isMale = profile.sex === 'm';

  return (
    <Card
      size="small"
      className={`bg-surface border-border shadow-1 space-y-3 ${className}`}
      title={
        <div className="flex items-center justify-between">
          <span className="font-semibold text-sm text-ink flex items-center gap-2">
            <UserOutlined className="text-brand" />
            <span>{label}</span>
          </span>
          <Tag color="magenta" className="m-0 font-mono text-xs font-bold">
            {profile.bloodType}
          </Tag>
        </div>
      }
    >
      {/* High Alert Tags */}
      {(profile.onBloodThinners || profile.pregnant) && (
        <div className="flex items-center gap-1.5 flex-wrap pb-2 border-b border-border">
          {profile.onBloodThinners && (
            <Tag color="error" className="m-0 font-semibold flex items-center gap-1">
              <AlertOutlined />
              Blood thinners
            </Tag>
          )}
          {profile.pregnant && (
            <Tag color="purple" className="m-0 font-semibold flex items-center gap-1">
              <MedicineBoxOutlined />
              Pregnant
            </Tag>
          )}
        </div>
      )}

      {/* Demographics & Medical History */}
      <Descriptions
        size="small"
        column={1}
        bordered
        className="bg-surface text-xs"
        styles={{
          label: { width: '38%', color: 'var(--muted)', fontWeight: 500 },
          content: { color: 'var(--ink)' },
        }}
      >
        <Descriptions.Item label="Age / Sex">
          {profile.ageYears} yrs · {isMale ? 'Male' : 'Female'}
        </Descriptions.Item>
        <Descriptions.Item label="Blood Type">
          <span className="font-mono font-bold text-sev-extreme">{profile.bloodType}</span>
        </Descriptions.Item>
        <Descriptions.Item label="Chronic Diseases">
          {profile.chronicDiseases && profile.chronicDiseases.length > 0
            ? profile.chronicDiseases.join(', ')
            : 'None reported'}
        </Descriptions.Item>
        <Descriptions.Item label="Allergies">
          {profile.allergies && profile.allergies.length > 0 ? (
            <span className="text-sev-high font-medium">{profile.allergies.join(', ')}</span>
          ) : (
            'None reported'
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Medications">
          {profile.medications && profile.medications.length > 0
            ? profile.medications.join(', ')
            : 'None reported'}
        </Descriptions.Item>
        {profile.emergencyContact && (
          <Descriptions.Item label="Emergency Contact">
            <div className="flex items-center gap-1.5 flex-wrap">
              <PhoneOutlined className="text-brand" />
              <span>{profile.emergencyContact.label}</span>
              <span className="font-mono text-xs text-muted ms-1" dir="ltr">
                {profile.emergencyContact.phone}
              </span>
            </div>
          </Descriptions.Item>
        )}
      </Descriptions>
    </Card>
  );
}
