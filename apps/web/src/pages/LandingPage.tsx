import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../config/axios';
import { SystemHealth } from '@lifeos/shared';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { useToastStore } from '../store/useToastStore';
import {
  Sparkles,
  Server,
  Layers,
  Activity,
  Boxes,
  Terminal,
  CheckCircle,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { addToast } = useToastStore();

  // Live Backend System Health Ping via TanStack Query
  const { data: healthData, isLoading, isError, refetch } = useQuery<SystemHealth>({
    queryKey: ['systemHealth'],
    queryFn: async () => {
      const res = await apiClient.get('/health');
      return res.data.data;
    },
    refetchInterval: 10000,
  });

  const triggerToast = (type: 'success' | 'error' | 'warning' | 'info') => {
    const messages = {
      success: { title: 'Architecture Action Triggered', message: 'Zustand toast system is working smoothly!' },
      error: { title: 'Test Error Toast', message: 'Simulated error notification caught by architecture logger.' },
      warning: { title: 'Rate Limiter Warning', message: 'System threshold checked by Express security stack.' },
      info: { title: 'Repository Pattern Ready', message: 'BaseRepository pattern is configured for MongoDB.' },
    };
    addToast({ type, ...messages[type] });
  };

  return (
    <div className="space-y-24 py-12 px-6 max-w-7xl mx-auto">
      {/* Hero Section */}
      <section className="text-center space-y-8 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-brand-500/15 blur-3xl rounded-full pointer-events-none -z-10" />

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-300 text-xs font-semibold uppercase tracking-widest shadow-glow">
          <Sparkles className="w-3.5 h-3.5" /> Flagship Production-Grade Architecture
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight max-w-4xl mx-auto leading-tight">
          The Scalable Architecture for <span className="gradient-text">LifeOS</span>
        </h1>

        <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
          Clean Architecture foundation powered by Node.js, Express, MongoDB, Repository Pattern, Shared TypeScript Monorepo, React, Zustand, and TanStack Query.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Button size="lg" variant="primary" onClick={() => setIsModalOpen(true)} leftIcon={<Terminal className="w-4 h-4" />}>
            Test Interactive Architecture Modal
          </Button>
          <a href="#health">
            <Button size="lg" variant="outline" leftIcon={<Activity className="w-4 h-4" />}>
              Live System Status
            </Button>
          </a>
        </div>
      </section>

      {/* Interactive Toast & System Test Playground */}
      <section className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-white">Architecture Testing Controls</h2>
          <p className="text-xs text-slate-400">Trigger frontend Zustand stores and state events</p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button size="sm" variant="secondary" onClick={() => triggerToast('success')} className="border-emerald-500/30 text-emerald-300">
            Trigger Success Toast
          </Button>
          <Button size="sm" variant="secondary" onClick={() => triggerToast('info')} className="border-brand-500/30 text-brand-300">
            Trigger Info Toast
          </Button>
          <Button size="sm" variant="secondary" onClick={() => triggerToast('warning')} className="border-amber-500/30 text-amber-300">
            Trigger Warning Toast
          </Button>
          <Button size="sm" variant="secondary" onClick={() => triggerToast('error')} className="border-rose-500/30 text-rose-300">
            Trigger Error Toast
          </Button>
        </div>
      </section>

      {/* Backend Live Health & Telemetry Section */}
      <section id="health" className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-400" /> Backend Telemetry Status
            </h2>
            <p className="text-xs text-slate-400 mt-1">Real-time status check pinging Express backend at <code className="text-brand-300">/api/v1/health</code></p>
          </div>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Refresh Health Ping
          </Button>
        </div>

        <Card glass hoverEffect className="border-emerald-500/20">
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 py-2">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Backend Status</p>
              <div className="mt-2 flex items-center gap-2">
                {isLoading ? (
                  <Badge variant="warning">Checking...</Badge>
                ) : isError ? (
                  <Badge variant="error">Offline / Connecting</Badge>
                ) : (
                  <Badge variant="success">Online (OK)</Badge>
                )}
              </div>
            </div>

            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">MongoDB Database</p>
              <p className="mt-2 font-mono text-sm font-bold text-slate-200">
                {healthData?.database.status ? healthData.database.status.toUpperCase() : 'DISCONNECTED'}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">System Uptime</p>
              <p className="mt-2 font-mono text-sm font-bold text-slate-200">
                {healthData?.uptimeSeconds ? `${healthData.uptimeSeconds}s` : 'N/A'}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Memory Heap Used</p>
              <p className="mt-2 font-mono text-sm font-bold text-slate-200">
                {healthData?.memoryUsage ? healthData.memoryUsage.heapUsed : 'N/A'}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Key Architectural Pillars */}
      <section id="architecture" className="space-y-8">
        <div className="text-center space-y-3">
          <Badge variant="brand">Scalable Monorepo Stack</Badge>
          <h2 className="text-3xl font-bold text-white tracking-tight">Enterprise Architectural Pillars</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card glass hoverEffect>
            <CardHeader>
              <Server className="w-8 h-8 text-brand-400 mb-2" />
              <CardTitle>Clean Backend & Repository Pattern</CardTitle>
              <CardDescription>
                Decoupled architecture with BaseRepository abstract class, Mongoose abstraction, and custom AppError hierarchy.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-brand-400" /> Standardized ApiResponse JSON format</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-brand-400" /> Zod request validation middleware</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-brand-400" /> Winston structured logger</li>
              </ul>
            </CardContent>
          </Card>

          <Card glass hoverEffect>
            <CardHeader>
              <Boxes className="w-8 h-8 text-indigo-400 mb-2" />
              <CardTitle>Shared Workspace Packages</CardTitle>
              <CardDescription>
                Zero-duplication Monorepo workspace setup sharing TypeScript DTOs, interfaces, and enums between web & API.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-indigo-400" /> Shared ApiResponse and Pagination contracts</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-indigo-400" /> User Roles & System Health types</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-indigo-400" /> Strictly typed boundary payloads</li>
              </ul>
            </CardContent>
          </Card>

          <Card glass hoverEffect>
            <CardHeader>
              <Layers className="w-8 h-8 text-purple-400 mb-2" />
              <CardTitle>React Web & Design System</CardTitle>
              <CardDescription>
                Feature-based React structure with Tailwind CSS, Zustand stores, TanStack Query, and glassmorphic UI primitives.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-purple-400" /> Persistent Dark/Light theme store</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-purple-400" /> Reusable Button, Input, Modal, Toast components</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-purple-400" /> Axios JWT interceptor client</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Architecture Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="LifeOS Architecture Blueprint"
        description="Verified Production SaaS Foundation Setup"
      >
        <div className="space-y-4 py-2 text-xs text-slate-300">
          <p>
            This LifeOS monorepo is fully initialized with production-grade architecture patterns.
          </p>
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-300 space-y-1">
            <p className="text-brand-400">✓ Express 4 + TypeScript + Mongoose</p>
            <p className="text-brand-400">✓ Repository Pattern (BaseRepository)</p>
            <p className="text-brand-400">✓ Swagger OpenAPI UI (/api-docs)</p>
            <p className="text-brand-400">✓ React 18 + Vite + Tailwind CSS</p>
            <p className="text-brand-400">✓ Docker Compose Orchestration</p>
          </div>
          <div className="pt-2 flex justify-end">
            <Button size="sm" variant="primary" onClick={() => setIsModalOpen(false)}>
              Close Architecture View
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
