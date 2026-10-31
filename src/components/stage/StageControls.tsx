'use client';

import React from 'react';
import { Segmented, Button, Tooltip, Tag } from 'antd';
import {
  ReloadOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';

export interface StageControlsProps {
  viewMode?: 'front' | 'back' | 'free';
  onViewChange?: (view: 'front' | 'back' | 'free') => void;
  onReset?: () => void;
  titleBadge?: string;
  tooltipText?: string;
  showCaption?: boolean;
  className?: string;
}

export function StageControls({
  viewMode = 'front',
  onViewChange,
  onReset,
  titleBadge = 'M4 estimate',
  tooltipText = 'Trained on crash-investigation data; ranks regions by likelihood of serious injury.',
  showCaption = true,
  className = '',
}: StageControlsProps) {

  return (
    <div className={`w-full h-full p-4 flex flex-col justify-between pointer-events-none ${className}`}>
      {/* Top Bar Overlay */}
      <div className="flex items-center justify-between w-full pointer-events-auto">
        <Segmented
          value={viewMode}
          onChange={(val) => onViewChange?.(val as 'front' | 'back' | 'free')}
          options={[
            { label: 'Front', value: 'front' },
            { label: 'Back', value: 'back' },
            { label: 'Free', value: 'free' },
          ]}
          className="bg-surface/90 backdrop-blur-md border border-border shadow-md"
        />

        <Tooltip title={tooltipText}>
          <Tag
            color="#006233"
            className="m-0 text-xs px-2.5 py-1 font-mono rounded-full border-none shadow-md flex items-center gap-1 cursor-help"
          >
            <InfoCircleOutlined />
            <span>{titleBadge}</span>
          </Tag>
        </Tooltip>
      </div>

      {/* Bottom Bar Overlay */}
      <div className="flex items-end justify-between w-full pointer-events-auto">
        {showCaption && (
          <div className="text-[12px] text-muted italic max-w-sm bg-surface/75 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-border">
            Estimate of where to look first.
          </div>
        )}

        {onReset && (
          <Button
            size="small"
            icon={<ReloadOutlined />}
            onClick={onReset}
            className="bg-surface/90 backdrop-blur-md border-border shadow-md text-xs"
          >
            Reset view
          </Button>
        )}
      </div>
    </div>
  );
}
