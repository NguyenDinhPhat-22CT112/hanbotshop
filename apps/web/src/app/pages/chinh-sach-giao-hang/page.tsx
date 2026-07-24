import type { Metadata } from 'next';
import { Breadcrumb } from '../../../components/breadcrumb';

export const metadata: Metadata = {
  title: 'Chính sách giao hàng | Hanbotorder',
  description: 'Thông tin giao hàng, tracking, đóng gói và thời gian xử lý đơn tại Hanbotorder.'
};

const steps = [
  {
    title: '1. Xác nhận thông tin',
    text: 'Shop kiểm tra địa chỉ, số điện thoại, hình thức giao hàng và tình trạng thanh toán trước khi gửi hàng.'
  },
  {
    title: '2. Đóng gói',
    text: 'Sản phẩm được đóng gói phù hợp với kích thước, độ dễ vỡ và tình trạng hộp để hạn chế rủi ro khi vận chuyển.'
  },
  {
    title: '3. Gửi hàng',
    text: 'Sau khi bàn giao cho đơn vị vận chuyển, shop cập nhật mã tracking hoặc thông tin giao hàng cho khách.'
  },
  {
    title: '4. Theo dõi đến khi nhận',
    text: 'Khách có thể theo dõi trạng thái vận chuyển và liên hệ shop nếu đơn bị chậm hoặc phát sinh vấn đề.'
  }
];

const policies = [
  {
    title: 'Thời gian xử lý',
    body: [
      'Đơn có sẵn thường được xử lý sau khi shop xác nhận thanh toán và thông tin giao hàng.',
      'Đơn pre-order sẽ được giao sau khi sản phẩm về kho, kiểm tra tình trạng và khách hoàn tất phần thanh toán còn lại.',
      'Đơn resin hoặc sản phẩm kích thước lớn có thể cần thêm thời gian đóng gói, kiểm tra và chọn phương án vận chuyển phù hợp.'
    ]
  },
  {
    title: 'Tracking và cập nhật đơn',
    body: [
      'Khi có mã vận đơn, shop sẽ cập nhật để khách chủ động theo dõi.',
      'Nếu đơn giao qua hình thức hẹn riêng hoặc vận chuyển đặc biệt, shop sẽ thông báo trực tiếp thay cho mã tracking tự động.',
      'Trạng thái giao hàng có thể cập nhật chậm hơn thực tế tùy hệ thống của đơn vị vận chuyển.'
    ]
  },
  {
    title: 'Phí vận chuyển',
    body: [
      'Phí vận chuyển được tính theo địa chỉ, kích thước kiện, cân nặng và yêu cầu đóng gói.',
      'Với sản phẩm lớn, dễ vỡ hoặc resin nhiều part, shop có thể đề xuất đóng kiện riêng để an toàn hơn.',
      'Mọi phụ phí phát sinh sẽ được báo trước để khách xác nhận.'
    ]
  }
];

export default function ShippingPolicyPage() {
  return (
    <main className="policy-page">
      <Breadcrumb items={[{ label: 'Chính sách giao hàng' }]} />

      <section className="policy-hero">
        <p>Vận chuyển và tracking</p>
        <h1>Chính sách giao hàng</h1>
        <span aria-hidden="true" />
      </section>

      <section className="policy-shell" aria-label="Nội dung chính sách giao hàng">
        <aside className="policy-summary" aria-label="Tóm tắt chính sách giao hàng">
          <strong>Giao hàng toàn quốc</strong>
          <p>
            Hanbotorder hỗ trợ giao hàng toàn quốc, ưu tiên đóng gói chắc chắn và cập nhật tiến độ rõ ràng
            cho từng đơn hàng.
          </p>
          <a href="/account/orders">Theo dõi đơn hàng</a>
        </aside>

        <div className="policy-content">
          <section className="policy-block">
            <h2>Quy trình giao hàng</h2>
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
            <h2>Khi nhận hàng</h2>
            <p>
              Khách nên kiểm tra ngoại quan kiện hàng và quay video khui hộp, đặc biệt với resin, figure hộp lớn
              hoặc sản phẩm có nhiều phụ kiện nhỏ.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
