import { DashboardHeader } from '../components/dashboard/dashboard-header';
import { QuickStats } from '../components/dashboard/quick-stats';
import { QuickActions } from '../components/dashboard/quick-actions';
import { OrderOverview } from '../components/dashboard/order-overview';
import { ProductionOverview } from '../components/dashboard/production-overview';
import { RecentOrders } from '../components/dashboard/recent-orders';
import { RecentActivities } from '../components/dashboard/recent-activities';
import { NotificationsWidget } from '../components/dashboard/notifications-widget';
import { SystemHealth } from '../components/dashboard/system-health';
import { RevenueWidget } from '../components/dashboard/revenue-widget';

export default function AdminHomePage() {
  return (
    <main className="dashboard-layout">
      <DashboardHeader />

      {/* Quick Stats - Full Width */}
      <section className="dashboard-section">
        <QuickStats />
      </section>

      {/* Quick Actions */}
      <section className="dashboard-section">
        <QuickActions />
      </section>

      {/* Main Content Grid */}
      <div className="dashboard-grid-2">
        <div className="dashboard-col">
          <RevenueWidget />
          <OrderOverview />
        </div>

        <div className="dashboard-col">
          <NotificationsWidget />
          <RecentActivities />
        </div>
      </div>

      {/* Production Overview - Full Width */}
      <section className="dashboard-section">
        <ProductionOverview />
      </section>

      {/* Recent Orders - Full Width */}
      <section className="dashboard-section">
        <RecentOrders />
      </section>

      {/* System Health */}
      <section className="dashboard-section">
        <SystemHealth />
      </section>
    </main>
  );
}
