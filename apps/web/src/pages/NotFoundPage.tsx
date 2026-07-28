import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { AlertTriangle } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
        <AlertTriangle className="w-8 h-8" />
      </div>
      <h1 className="text-4xl font-extrabold text-white">404 - Page Not Found</h1>
      <p className="text-sm text-slate-400 max-w-md">
        The route you are trying to access does not exist in the LifeOS application shell.
      </p>
      <Link to="/">
        <Button variant="primary">Return to Home</Button>
      </Link>
    </div>
  );
};
