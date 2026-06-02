import dynamic from 'next/dynamic';

export const DynamicAllProjectsMap = dynamic(() => import('./AllProjectsMap'), {
  ssr: false,
  loading: () => (
    <div
      className="bg-gray-100 animate-pulse flex items-center justify-center text-gray-400 text-sm"
      style={{ width: '100%', height: '100%', minHeight: '500px' }}
    >
      Loading map…
    </div>
  ),
});
