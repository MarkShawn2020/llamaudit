export default async function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="py-6">
      {children}
    </div>
  );
}
