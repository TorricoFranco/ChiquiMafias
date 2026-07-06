export const SectionTitle = ({ icon, title }: { icon: React.ReactNode, title: string }) => (
  <div className="flex items-center gap-3 mb-6">
    {icon}
    <h3 className="text-xl font-black italic uppercase tracking-tighter">{title}</h3>
  </div>
);
