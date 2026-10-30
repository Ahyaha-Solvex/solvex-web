'use client';

import React, { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Card, Button, Slider, InputNumber, Segmented, Tag, message, Space } from 'antd';
import {
  CopyOutlined,
  ReloadOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import { BASE_ANCHORS, type BodyRegionAnchor } from '@/lib/three/regions';
import type { BodyRegion } from '@/lib/data/types';
import { StageFrame } from './StageFrame';



// Dynamically import Body3D with ssr: false per Rule 11
const Body3D = dynamic(() => import('@/components/stage/Body3D'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center text-muted font-mono text-xs">
      Loading 3D Body Canvas...
    </div>
  ),
});

export function BodyCalibrationView() {
  const [anchors, setAnchors] = useState<BodyRegionAnchor[]>(BASE_ANCHORS);
  const [selectedRegionId, setSelectedRegionId] = useState<BodyRegion>('head');
  const [viewMode, setViewMode] = useState<'front' | 'back' | 'free'>('front');
  const [copied, setCopied] = useState(false);

  // Find the anchor currently selected for calibration
  const activeAnchorIndex = anchors.findIndex((a) => a.id === selectedRegionId);
  const activeAnchor = anchors[activeAnchorIndex] ?? anchors[0];

  const updateActiveAnchor = (
    field: 'x' | 'y' | 'z' | 'radius',
    val: number | null
  ) => {
    if (val === null || isNaN(val) || activeAnchorIndex === -1) return;

    setAnchors((prev) => {
      const next = [...prev];
      const target = { ...next[activeAnchorIndex] };
      const [x, y, z] = target.position;

      if (field === 'x') target.position = [val, y, z];
      else if (field === 'y') target.position = [x, val, z];
      else if (field === 'z') target.position = [x, y, val];
      else if (field === 'radius') target.radius = val;

      next[activeAnchorIndex] = target;
      return next;
    });
  };

  const handleCopyJson = () => {
    const jsonStr = JSON.stringify(anchors, null, 2);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(jsonStr);
    }
    console.log('--- CALIBRATED BASE_ANCHORS ---');
    console.log(jsonStr);
    setCopied(true);
    message.success('Anchor coordinates copied to clipboard & printed to console!');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleReset = () => {
    setAnchors(BASE_ANCHORS);
    message.info('Reset anchor positions to baseline definitions.');
  };

  const jsonSnippet = useMemo(() => {
    return JSON.stringify(anchors, null, 2);
  }, [anchors]);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-ink">3D Body Anchor Calibration</h1>
            <Tag color="#006233" className="font-mono text-xs">
              SPEC_3D
            </Tag>
          </div>
          <p className="text-sm text-muted mt-1">
            Tune anchor sphere coordinates [x, y, z] and hitboxes in real-time. Symmetrical limbs (arms & legs) mirror automatically across the x-axis.
          </p>
        </div>

        <Space size="middle">
          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            Reset
          </Button>
          <Button
            type="primary"
            icon={copied ? <CheckOutlined /> : <CopyOutlined />}
            onClick={handleCopyJson}
            className="bg-brand text-white font-medium"
          >
            {copied ? 'Copied!' : 'Copy JSON'}
          </Button>
        </Space>
      </div>

      {/* Main Split Layout: 3D Stage on Left, Calibration Sliders on Right */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left: Interactive 3D Canvas in StageFrame */}
        <div className="xl:col-span-7">
          <Card
            className="bg-surface border-border overflow-hidden p-0"
            styles={{ body: { padding: 0 } }}
          >
            <div className="p-3 border-b border-border flex items-center justify-between bg-surface/75">
              <Segmented
                value={viewMode}
                onChange={(val) => setViewMode(val as 'front' | 'back' | 'free')}
                options={[
                  { label: 'Front (0°)', value: 'front' },
                  { label: 'Back (180°)', value: 'back' },
                  { label: 'Free Orbit', value: 'free' },
                ]}
              />

              <div className="text-xs text-muted font-mono flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-brand" />
                Active: <strong className="text-ink capitalize">{selectedRegionId.replace('_', ' ')}</strong>
              </div>
            </div>

            <StageFrame height="600px" showGrid={true}>
              <Body3D
                viewMode={viewMode}
                customAnchors={anchors}
                isCalibrating={true}
                onSelectAnchor={(anchor) => setSelectedRegionId(anchor.id)}
              />
            </StageFrame>
          </Card>
        </div>

        {/* Right: Region Selector & Live Calibration Sliders */}
        <div className="xl:col-span-5 space-y-4">
          <Card
            title={
              <div className="flex items-center justify-between">
                <span>Region Coordinates</span>
                <Tag color="#006233" className="uppercase font-mono text-[11px]">
                  {selectedRegionId}
                </Tag>
              </div>
            }
            className="bg-surface border-border shadow-sm"
          >
            {/* Region Switcher Pills */}
            <div className="mb-6">
              <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-2">
                Select Region to Calibrate
              </label>
              <div className="flex flex-wrap gap-1.5">
                {anchors.map((a) => {
                  const isSelected = a.id === selectedRegionId;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setSelectedRegionId(a.id)}
                      className={`px-3 py-1 text-xs rounded-full font-medium transition-all ${
                        isSelected
                          ? 'bg-brand text-white shadow-sm'
                          : 'bg-surface-elevated text-ink hover:border-brand border border-border'
                      }`}
                    >
                      {a.id.replace('_', ' ')}
                      {a.side && ` (${a.side.toUpperCase()})`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Slider Controls for Active Anchor */}
            {activeAnchor && (
              <div className="space-y-4 border-t border-border pt-4">
                {/* X Position */}
                <div>
                  <div className="flex justify-between items-center mb-1 text-xs">
                    <span className="font-mono text-muted">X Position (lateral)</span>
                    <InputNumber
                      size="small"
                      step={0.01}
                      min={-1.0}
                      max={1.0}
                      value={activeAnchor.position[0]}
                      onChange={(v) => updateActiveAnchor('x', v)}
                      className="font-mono text-xs w-24"
                    />
                  </div>
                  <Slider
                    min={-0.6}
                    max={0.6}
                    step={0.01}
                    value={activeAnchor.position[0]}
                    onChange={(v) => updateActiveAnchor('x', v)}
                  />
                </div>

                {/* Y Position */}
                <div>
                  <div className="flex justify-between items-center mb-1 text-xs">
                    <span className="font-mono text-muted">Y Position (vertical)</span>
                    <InputNumber
                      size="small"
                      step={0.01}
                      min={-1.0}
                      max={1.0}
                      value={activeAnchor.position[1]}
                      onChange={(v) => updateActiveAnchor('y', v)}
                      className="font-mono text-xs w-24"
                    />
                  </div>
                  <Slider
                    min={-0.9}
                    max={0.9}
                    step={0.01}
                    value={activeAnchor.position[1]}
                    onChange={(v) => updateActiveAnchor('y', v)}
                  />
                </div>

                {/* Z Position */}
                <div>
                  <div className="flex justify-between items-center mb-1 text-xs">
                    <span className="font-mono text-muted">Z Position (depth)</span>
                    <InputNumber
                      size="small"
                      step={0.01}
                      min={-0.5}
                      max={0.5}
                      value={activeAnchor.position[2]}
                      onChange={(v) => updateActiveAnchor('z', v)}
                      className="font-mono text-xs w-24"
                    />
                  </div>
                  <Slider
                    min={-0.3}
                    max={0.3}
                    step={0.01}
                    value={activeAnchor.position[2]}
                    onChange={(v) => updateActiveAnchor('z', v)}
                  />
                </div>

                {/* Radius */}
                <div>
                  <div className="flex justify-between items-center mb-1 text-xs">
                    <span className="font-mono text-muted">Hitbox Radius</span>
                    <InputNumber
                      size="small"
                      step={0.005}
                      min={0.02}
                      max={0.3}
                      value={activeAnchor.radius}
                      onChange={(v) => updateActiveAnchor('radius', v)}
                      className="font-mono text-xs w-24"
                    />
                  </div>
                  <Slider
                    min={0.03}
                    max={0.25}
                    step={0.005}
                    value={activeAnchor.radius}
                    onChange={(v) => updateActiveAnchor('radius', v)}
                  />
                </div>
              </div>
            )}
          </Card>

          {/* JSON Export Card */}
          <Card
            title={
              <div className="flex items-center justify-between text-xs">
                <span>Current BASE_ANCHORS Array</span>
                <Button
                  size="small"
                  type="text"
                  icon={<CopyOutlined />}
                  onClick={handleCopyJson}
                >
                  Copy
                </Button>
              </div>
            }
            className="bg-surface border-border"
          >
            <pre className="text-[11px] font-mono p-3 bg-surface-elevated rounded border border-border max-h-48 overflow-auto text-ink/80 select-all">
              {jsonSnippet}
            </pre>
          </Card>
        </div>
      </div>
    </div>
  );
}
