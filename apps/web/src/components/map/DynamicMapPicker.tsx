import dynamic from 'next/dynamic';
import type { MapPickerProps } from './MapPicker';

const MapPickerDynamic = dynamic(() => import('./MapPicker'), {
  ssr: false,
  loading: () => (
    <div
      style={{ width: '100%', height: '400px', borderRadius: '0.75rem' }}
      className="bg-gray-100 animate-pulse flex items-center justify-center text-gray-400 text-sm"
    >
      Loading map…
    </div>
  ),
});

export function DynamicMapPicker(props: MapPickerProps) {
  return <MapPickerDynamic {...props} />;
}
