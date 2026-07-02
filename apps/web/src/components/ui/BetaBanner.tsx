export default function BetaBanner() {
  return (
    <div className="bg-amber-500 text-amber-950" role="status">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2 text-sm">
        <span className="font-semibold uppercase tracking-wide">Beta</span>
        <p className="flex-1">
          This platform is in active development. Projects and data shown are for
          demonstration purposes only. No real carbon credits are being sold yet.
        </p>
      </div>
    </div>
  );
}
