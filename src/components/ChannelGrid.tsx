/** Responsive Wii-style channel grid wrapper. */
export function ChannelGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5">
      {children}
    </div>
  );
}
