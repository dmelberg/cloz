'use client';

import PageHeader from '../../components/PageHeader';
import GarmentForm from '../../components/GarmentForm';

export default function AddGarmentPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <PageHeader title="Add Garment" showBack />
      <div className="p-4 max-w-lg mx-auto">
        <GarmentForm />
      </div>
    </div>
  );
}
