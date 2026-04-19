import { AnalyticsDashboard } from "@/components/analytics-dashboard";
import { PanelErrorBoundary } from "@/components/error-boundary";

export default function AnalyticsPage() {
  return (
    <PanelErrorBoundary panelName="Analytics">
      <AnalyticsDashboard />
    </PanelErrorBoundary>
  );
}
