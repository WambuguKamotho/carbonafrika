"use client";
import { Eye } from "lucide-react";

/**
 * Shown at the top of every admin page when the current user has role VIEWER.
 * The backend rejects any non-GET request from VIEWER anyway, but this banner
 * sets expectations and removes the confusion of grey-disabled action buttons.
 */
export default function ReadOnlyBanner() {
  return (
    <div className="bg-gray-900 text-gray-100 text-sm">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-2.5">
        <Eye className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <span className="font-semibold">Read-only access.</span>
        <span className="text-gray-400">
          You can browse the admin surface but cannot approve, reject, edit, or publish anything.
        </span>
      </div>
    </div>
  );
}
