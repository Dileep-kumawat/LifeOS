import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { LayoutDashboard, Sparkles, Database, Cpu } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-brand-400" /> LifeOS Dashboard Shell
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Production-grade SaaS application layout ready for feature implementations.
          </p>
        </div>
        <Badge variant="brand">Architecture Stencil</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card glass>
          <CardHeader>
            <div className="w-8 h-8 rounded-lg bg-brand-500/20 text-brand-400 flex items-center justify-center mb-2">
              <Sparkles className="w-4 h-4" />
            </div>
            <CardTitle>Zustand State Stores</CardTitle>
            <CardDescription>Theme, Toast, and Auth State ready</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </CardContent>
        </Card>

        <Card glass>
          <CardHeader>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-2">
              <Database className="w-4 h-4" />
            </div>
            <CardTitle>TanStack Query</CardTitle>
            <CardDescription>Cache & Server state client ready</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </CardContent>
        </Card>

        <Card glass>
          <CardHeader>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2">
              <Cpu className="w-4 h-4" />
            </div>
            <CardTitle>JWT Guard Ready</CardTitle>
            <CardDescription>Authorization interceptors active</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
