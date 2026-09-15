import { RecommendationsSkeleton } from "@/components/RecommendationsSkeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-9 w-48 rounded-full bg-line" />
      <RecommendationsSkeleton />
    </div>
  );
}
