'use client';

import React from 'react';
import {
  Card,
  Button,
  Tag,
  Progress,
  Tooltip,
  notification,
  Space,
} from 'antd';
import {
  CheckCircleFilled,
  ClockCircleOutlined,
  CompassOutlined,
  EnvironmentOutlined,
  InfoCircleOutlined,
  PhoneOutlined,
  ThunderboltOutlined,
  ToolOutlined,
  CarOutlined,
  CloseOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { useTranslations } from 'next-intl';
import { useBreakdownStore } from '@/lib/stores/breakdownStore';
import type { BreakdownIssueType, BreakdownRequest } from '@/lib/data/breakdownTypes';

interface BreakdownRequestCardProps {
  request: BreakdownRequest;
  onClose?: () => void;
}

const ISSUE_ICONS: Record<BreakdownIssueType, React.ReactNode> = {
  engine: <ToolOutlined className="text-amber-500" />,
  flat_tire: <CarOutlined className="text-orange-500" />,
  battery: <ThunderboltOutlined className="text-yellow-500" />,
  overheat: <InfoCircleOutlined className="text-red-500" />,
  accident_minor: <CarOutlined className="text-red-600" />,
};

export function BreakdownRequestCard({ request, onClose }: BreakdownRequestCardProps) {
  const t = useTranslations('breakdown');

  const acceptRequest = useBreakdownStore((s) => s.acceptRequest);
  const declineRequest = useBreakdownStore((s) => s.declineRequest);
  const cancelMission = useBreakdownStore((s) => s.cancelMission);
  const completeMission = useBreakdownStore((s) => s.completeMission);

  const handleCallUser = () => {
    notification.info({
      message: t('callingDriver'),
      description: `${request.userName} (${request.userPhone})`,
      placement: 'topRight',
    });
  };

  const handleAccept = () => {
    acceptRequest(request.id);
    notification.success({
      message: t('missionAccepted'),
      description: t('navigationStartedDesc', { name: request.userName }),
      placement: 'topRight',
    });
  };

  const handleDecline = () => {
    declineRequest(request.id);
    notification.warning({
      message: t('missionDeclined'),
      description: t('missionDeclinedDesc'),
      placement: 'topRight',
    });
  };

  const isPending = request.status === 'pending';
  const isEnRoute = request.status === 'en_route';
  const isOnScene = request.status === 'on_scene';
  const isCompleted = request.status === 'completed';

  const progressPercent = Math.round((request.currentProgress ?? 0) * 100);

  return (
    <Card
      className="shadow-xl rounded-2xl border-[#E2DDD3] bg-[#FAF8F3] overflow-hidden"
      styles={{ body: { padding: '16px' } }}
    >
      {/* Header with Client Info and Close */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#E2DDD3]">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-[#E8E4DB] flex items-center justify-center text-lg font-bold text-[#14201A] shrink-0 border border-[#D5CFBE]">
            {request.userName.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-[#14201A]">{request.userName}</span>
              <CheckCircleFilled className="text-[#006233] text-xs" />
            </div>
            <div className="text-xs text-[#5C675F] flex items-center gap-1">
              <span>{request.vehicleModel}</span>
              <span>•</span>
              <span className="font-mono bg-white px-1 py-0.2 rounded border border-[#E2DDD3] text-[10px]">
                {request.vehiclePlate}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Tooltip title={t('callDriver')}>
            <Button
              type="default"
              shape="circle"
              size="small"
              icon={<PhoneOutlined className="text-[#006233]" />}
              onClick={handleCallUser}
              className="border-[#006233]/30 hover:border-[#006233]"
            />
          </Tooltip>
          {onClose && (
            <Button
              type="text"
              shape="circle"
              size="small"
              icon={<CloseOutlined className="text-[#5C675F]" />}
              onClick={onClose}
            />
          )}
        </div>
      </div>

      {/* Breakdown Details */}
      <div className="py-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {ISSUE_ICONS[request.issueType]}
            <Tag color="gold" className="text-xs font-semibold m-0">
              {t(`issueTypes.${request.issueType}`)}
            </Tag>
          </div>
          <div className="flex items-center gap-1 font-bold text-sm text-[#006233]">
            <DollarOutlined />
            <span>{request.priceDzd.toLocaleString()} DZD</span>
          </div>
        </div>

        <p className="text-xs text-[#5C675F] bg-white p-2.5 rounded-lg border border-[#E2DDD3] leading-relaxed">
          {request.issueDescription}
        </p>

        {/* Location & Metrics */}
        <div className="grid grid-cols-3 gap-2 py-1 text-center">
          <div className="bg-white p-2 rounded-lg border border-[#E2DDD3]">
            <div className="text-[10px] text-[#5C675F] uppercase tracking-wide flex items-center justify-center gap-1">
              <CompassOutlined /> {t('distance')}
            </div>
            <div className="font-bold text-sm text-[#14201A] mt-0.5">
              {request.distanceKm} km
            </div>
          </div>

          <div className="bg-white p-2 rounded-lg border border-[#E2DDD3]">
            <div className="text-[10px] text-[#5C675F] uppercase tracking-wide flex items-center justify-center gap-1">
              <ClockCircleOutlined /> {t('eta')}
            </div>
            <div className="font-bold text-sm text-[#14201A] mt-0.5">
              {request.etaMinutes} min
            </div>
          </div>

          <div className="bg-white p-2 rounded-lg border border-[#E2DDD3]">
            <div className="text-[10px] text-[#5C675F] uppercase tracking-wide flex items-center justify-center gap-1">
              <EnvironmentOutlined /> {t('statusLabel')}
            </div>
            <div className="font-semibold text-xs text-[#006233] mt-0.5 capitalize">
              {t(`statuses.${request.status}`)}
            </div>
          </div>
        </div>

        <div className="text-[11px] text-[#5C675F] flex items-center gap-1 px-1">
          <EnvironmentOutlined className="text-[#D21034] shrink-0" />
          <span className="truncate">{request.roadLabel}</span>
        </div>
      </div>

      {/* Mission Progress if En Route or On Scene */}
      {(isEnRoute || isOnScene) && (
        <div className="pt-2 pb-3 border-t border-[#E2DDD3]">
          <div className="flex justify-between text-xs font-semibold mb-1">
            <span className="text-[#14201A]">
              {isOnScene ? t('onScene') : t('enRoute')}
            </span>
            <span className="text-[#006233]">{progressPercent}%</span>
          </div>
          <Progress
            percent={progressPercent}
            status={isOnScene ? 'success' : 'active'}
            strokeColor="#006233"
            showInfo={false}
          />
        </div>
      )}

      {/* Action Buttons */}
      <div className="pt-2">
        {isPending && (
          <div className="flex gap-2">
            <Button
              danger
              onClick={handleDecline}
              className="flex-1 font-semibold rounded-lg"
            >
              {t('decline')}
            </Button>
            <Button
              type="primary"
              onClick={handleAccept}
              className="flex-1 font-semibold rounded-lg bg-[#006233] hover:bg-[#004f29] border-none text-white"
            >
              {t('accept')}
            </Button>
          </div>
        )}

        {isEnRoute && (
          <Space direction="vertical" className="w-full">
            <Button
              type="primary"
              block
              onClick={() => completeMission(request.id)}
              className="font-semibold rounded-lg bg-[#006233] hover:bg-[#004f29] border-none text-white"
            >
              {t('completeTowing')}
            </Button>
            <Button
              type="text"
              danger
              size="small"
              block
              onClick={() => cancelMission(request.id)}
            >
              {t('cancelMission')}
            </Button>
          </Space>
        )}

        {isOnScene && (
          <Button
            type="primary"
            block
            onClick={() => completeMission(request.id)}
            className="font-semibold rounded-lg bg-[#006233] hover:bg-[#004f29] border-none text-white"
          >
            {t('completeTowing')}
          </Button>
        )}

        {isCompleted && (
          <div className="text-center py-1.5 text-xs font-bold text-[#006233] bg-[#E8F5E9] rounded-lg">
            ✓ {t('missionCompleted')}
          </div>
        )}
      </div>
    </Card>
  );
}
