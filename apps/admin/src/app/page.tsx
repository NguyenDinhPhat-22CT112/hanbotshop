import { DashboardHeader } from '../components/dashboard/dashboard-header';
import { QuickStats } from '../components/dashboard/quick-stats';
import { OrderOverview } from '../components/dashboard/order-overview';
import { RecentOrders } from '../components/dashboard/recent-orders';
import { RecentActivities } from '../components/dashboard/recent-activities';
import { NotificationsWidget } from '../components/dashboard/notifications-widget';
import { SystemHealth } from '../components/dashboard/system-health';

export default function AdminHomePage() {
  return (
    <main className="dashboard-layout">
      <DashboardHeader />

      {/* Quick Stats - Full Width */}
      <section className="dashboard-section">
        <QuickStats />
      </section>

      {/* Main Content Grid */}
      <div className="dashboard-grid-2">
        <div className="dashboard-col">
          <OrderOverview />
          <RecentOrders />
        </div>

        <div className="dashboard-col">
          <NotificationsWidget />
          <RecentActivities />
        </div>
      </div>

      {/* System Health */}
      <section className="dashboard-section">
        <SystemHealth />
      </section>
    </main>
  );
}
