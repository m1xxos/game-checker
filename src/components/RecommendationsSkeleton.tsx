/** Loading placeholder for the recommendations body (route + Suspense fallback). */
export function RecommendationsSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <div className="card-surface space-y-4 p-5">
        {[3, 2, 4].map((n, row) => (
          <div key={row} className="space-y-2">
            <div className="h-3 w-24 rounded-full bg-line" />
            <div className="flex gap-2">
              {Array.from({ length: n }).map((_, i) => (
                <div key={i} className="h-9 w-28 rounded-full bg-line/70" />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="aspect-3/4 animate-pulse rounded-card bg-line/60"
          />
        ))}
      </div>
    </div>
  );
}
