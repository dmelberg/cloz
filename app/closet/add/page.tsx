'use client';

import { useRouter } from 'next/navigation';
import PageHeader from '../../components/PageHeader';
import GarmentForm from '../../components/GarmentForm';
import { useToast } from '@/hooks/use-toast';

export default function AddGarmentPage() {
  const router = useRouter();
  const { toast } = useToast();

  function handleSuccess() {
    toast({
      title: 'Item added',
      description: 'Your new item has been added to your closet.',
      variant: 'success',
    });
    router.push('/closet');
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Add Item" showBack />
      <div className="p-4 max-w-lg mx-auto">
        <GarmentForm onSuccess={handleSuccess} />
      </div>
    </div>
  );
}
