import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 space-y-5">
      {/* Typographic 404 mark */}
      <p className="font-mono text-[80px] font-light text-border leading-none select-none">
        404
      </p>

      <div className="space-y-2">
        <h1 className="font-serif text-2xl font-light text-ink tracking-tight">
          Page not found
        </h1>
        <p className="text-sm text-muted max-w-xs mx-auto leading-relaxed">
          The route you are looking for does not exist in this workspace.
        </p>
      </div>

      <Link to="/">
        <Button variant="primary">Return to Home</Button>
      </Link>
    </div>
  );
};
