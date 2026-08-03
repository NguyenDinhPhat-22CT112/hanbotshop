import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { SiteHeader } from '../components/site-header';
import './globals.css';
import './cart.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: { default: 'Hanbotorder', template: '%s | Hanbotorder' },
  description: 'Đặt trước figure, mô hình sưu tầm và theo dõi đơn hàng rõ ràng tại Hanbotorder.',
  alternates: { canonical: '/' },
  openGraph: { type: 'website', locale: 'vi_VN', siteName: 'Hanbotorder', title: 'Hanbotorder', description: 'Figure, mô hình sưu tầm, hàng có sẵn và pre-order.' },
  twitter: { card: 'summary', title: 'Hanbotorder', description: 'Figure, mô hình sưu tầm, hàng có sẵn và pre-order.' },
  manifest: '/manifest.webmanifest',
  robots: { index: true, follow: true }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'Hanbotorder',
              url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
              email: 'hann34567890@gmail.com',
              telephone: '0966480510'
            }).replace(/</g, '\\u003c')
          }}
        />
        <a className="skip-link" href="#main-content">Bỏ qua điều hướng</a>
        <SiteHeader />
        <div id="main-content" tabIndex={-1}>{children}</div>
        <footer className="site-footer">
          <div className="footer-inner">
            <section className="footer-about">
              <h2>Hanbotorder</h2>
              <p>
                Hanbotorder chuyên nhận order figure và mô hình sưu tầm. Shop hỗ trợ tư vấn trước khi chốt đơn và cập nhật tiến độ rõ ràng.
              </p>
            </section>

            <address className="footer-contact" aria-label="Liên hệ shop">
              <p>
                <strong>Địa chỉ:</strong> Hồ Chí Minh, Việt Nam. Nhận order online và hỗ trợ giao hàng toàn quốc.
              </p>
              <p>
                <strong>Điện thoại:</strong> <a href="tel:0966480510">0966480510</a>
              </p>
              <p>
                <strong>Email:</strong> <a href="mailto:hann34567890@gmail.com">hann34567890@gmail.com</a>
              </p>
            </address>

            <nav className="footer-support" aria-label="Hỗ trợ khách hàng">
              <h2>Hỗ trợ khách hàng</h2>
              <a href="/san-pham">Sản phẩm</a>
              <a href="/chinh-sach/mua-hang">Chính sách mua hàng</a>
              <a href="/chinh-sach/thanh-toan">Chính sách thanh toán</a>
              <a href="/chinh-sach/giao-hang">Chính sách giao hàng</a>
              <a href="/chinh-sach/doi-tra">Chính sách đổi trả</a>
              <a href="/account/orders">Theo dõi đơn hàng</a>
              <a href="/account">Thông tin tài khoản</a>
              <a href="/cart">Giỏ hàng</a>
            </nav>

            <section className="footer-care">
              <h2>Chăm sóc khách hàng</h2>
              <a className="footer-hotline" href="tel:0966480510">
                <span aria-hidden="true">☎</span>
                <strong>0966480510</strong>
              </a>
              <a className="footer-email" href="mailto:hann34567890@gmail.com">
                hann34567890@gmail.com
              </a>

              <h3>Kết nối với shop</h3>
              <a className="footer-email" href="mailto:hann34567890@gmail.com">
                Gửi email cho Hanbotorder
              </a>
            </section>
          </div>

          <div className="footer-bottom">
            <span>Copyright © 2026 Hanbotorder.</span>
            <span>Vận hành bởi Hanbotorder Shop.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
