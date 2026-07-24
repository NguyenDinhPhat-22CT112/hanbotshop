import type { Metadata } from 'next';
import { Breadcrumb } from '../../../components/breadcrumb';

export const metadata: Metadata = {
  title: 'Chính sách thanh toán | Hanbotorder',
  description: 'Hướng dẫn thanh toán, đặt cọc và thanh toán phần còn lại cho đơn hàng Hanbotorder.'
};

const steps = [
  {
    title: '1. Nhận báo giá',
    text: 'Shop xác nhận giá sản phẩm, tiền cọc, phần còn lại và các khoản phí liên quan trước khi khách thanh toán.'
  },
  {
    title: '2. Thanh toán cọc',
    text: 'Với pre-order, resin hoặc đơn đặt riêng, khách thanh toán cọc để shop giữ slot hoặc bắt đầu xử lý yêu cầu.'
  },
  {
    title: '3. Cập nhật tiến độ',
    text: 'Shop lưu thông tin thanh toán vào đơn hàng và cập nhật khi sản phẩm sản xuất, về kho hoặc sẵn sàng giao.'
  },
  {
    title: '4. Thanh toán còn lại',
    text: 'Trước khi giao hàng, khách hoàn tất số tiền còn lại và phí vận chuyển nếu có.'
  }
];

const policies = [
  {
    title: 'Hình thức thanh toán',
    body: [
      'Hiện shop ưu tiên xác nhận thanh toán qua chuyển khoản hoặc phương thức được thông báo trong quá trình chốt đơn.',
      'Cổng thanh toán online sẽ được tích hợp và cập nhật sau khi hoàn thiện cấu hình vận hành.',
      'Nội dung chuyển khoản nên có mã đơn hoặc số điện thoại để shop đối soát nhanh hơn.'
    ]
  },
  {
    title: 'Đặt cọc',
    body: [
      'Tiền cọc giúp giữ slot pre-order, giữ hàng hoặc bắt đầu xử lý đơn resin/commission.',
      'Mức cọc có thể thay đổi theo giá trị sản phẩm, yêu cầu của nhà cung cấp hoặc độ phức tạp của đơn.',
      'Một số khoản cọc có thể không hoàn lại nếu shop đã thanh toán cho đối tác hoặc đã bắt đầu xử lý theo yêu cầu.'
    ]
  },
  {
    title: 'Thanh toán phần còn lại',
    body: [
      'Phần còn lại sẽ được shop thông báo khi sản phẩm sắp về, đã về kho hoặc trước thời điểm giao hàng.',
      'Đơn hàng chỉ được giao sau khi shop xác nhận hoàn tất thanh toán theo thỏa thuận.',
      'Nếu khách cần chia nhỏ thanh toán, vui lòng trao đổi trước để shop kiểm tra khả năng hỗ trợ.'
    ]
  }
];

export default function PaymentPolicyPage() {
  return (
    <main className="policy-page">
      <Breadcrumb items={[{ label: 'Chính sách thanh toán' }]} />

      <section className="policy-hero">
        <p>Đặt cọc và đối soát</p>
        <h1>Chính sách thanh toán</h1>
        <span aria-hidden="true" />
      </section>

      <section className="policy-shell" aria-label="Nội dung chính sách thanh toán">
        <aside className="policy-summary" aria-label="Tóm tắt chính sách thanh toán">
          <strong>Rõ từng khoản</strong>
          <p>
            Mỗi đơn hàng sẽ được ghi nhận tiền cọc, tiền còn lại, phí vận chuyển và trạng thái thanh toán
            để khách dễ theo dõi.
          </p>
          <a href="tel:0966480510">Xác nhận thanh toán: 0966480510</a>
        </aside>

        <div className="policy-content">
          <section className="policy-block">
            <h2>Quy trình thanh toán</h2>
            <div className="policy-step-grid">
              {steps.map((step) => (
                <article key={step.title} className="policy-step">
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </article>
              ))}
            </div>
          </section>

          {policies.map((policy) => (
            <section key={policy.title} className="policy-block">
              <h2>{policy.title}</h2>
              <ul>
                {policy.body.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ))}

          <section className="policy-note-panel">
            <h2>Lưu ý</h2>
            <p>
              Vui lòng chỉ thanh toán sau khi đã được shop xác nhận thông tin đơn. Nếu chuyển khoản nhầm
              hoặc thiếu nội dung, hãy liên hệ shop để được đối soát.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
