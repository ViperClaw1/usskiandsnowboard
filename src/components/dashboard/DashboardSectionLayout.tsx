import { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface DashboardSectionLayoutProps {
  title: string;
  onBack: () => void;
  children: ReactNode;
}

export const DashboardSectionLayout = ({ title, onBack, children }: DashboardSectionLayoutProps) => {
  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-8 max-w-7xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold">{title}</h2>
        <Button variant="outline" onClick={onBack} className="w-full sm:w-auto">
          Back to Home
        </Button>
      </div>
      {children}
    </div>
  );
};
