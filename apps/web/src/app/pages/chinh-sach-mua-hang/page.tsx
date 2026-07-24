import type { Metadata } from 'next';
import { Breadcrumb } from '../../../components/breadcrumb';

export const metadata: Metadata = {
  title: 'Chính sách mua hàng | Hanbotorder',
  description: 'Quy trình đặt hàng, thanh toán, giao hàng và hỗ trợ sau mua tại Hanbotorder.'
};

const steps = [
  {
    title: '1. Chọn sản phẩm',
    text: 'Khách hàng chọn figure, resin hoặc mô hình cần đặt. Với sản phẩm pre-order, shop sẽ tư vấn rõ tình trạng mở cọc, ngày dự kiến phát hành và các mốc thanh toán.'
  },
  {
    title: '2. Xác nhận đơn',
    text: 'Hanbotorder kiểm tra lại giá, thông tin sản phẩm, phương án vận chuyển và liên hệ xác nhận trước khi tạo đơn.'
  },
  {
    title: '3. Thanh toán',
    text: 'Khách hàng thanh toán cọc hoặc thanh toán đầy đủ tùy theo từng sản phẩm. Mọi khoản thanh toán được ghi nhận vào đơn hàng để tiện theo dõi.'
  },
  {
    title: '4. Theo dõi và nhận hàng',
    text: 'Shop cập nhật trạng thái đơn hàng trong quá trình đặt, sản xuất, về kho và giao đến khách. Khi có tracking, shop sẽ thông báo để khách chủ động theo dõi.'
  }
];

const policies = [
  {
    title: 'Đặt cọc và thanh toán',
    body: [
      'Sản phẩm pre-order hoặc resin commission có thể yêu cầu đặt cọc để giữ slot.',
      'Số tiền còn lại sẽ được thông báo khi sản phẩm sắp về kho hoặc trước khi giao hàng.',
      'Đơn hàng chỉ được xử lý sau khi shop xác nhận đã nhận thanh toán.'
    ]
  },
  {
    title: 'Giá bán và phí vận chuyển',
    body: [
      'Giá hiển thị trên website là giá tham khảo tại thời điểm đăng bán và có thể thay đổi với đơn hàng chưa xác nhận.',
      'Phí vận chuyển nội địa, quốc tế hoặc phụ phí đóng gói sẽ được thông báo rõ trước khi khách chốt đơn.',
      'Với sản phẩm có kích thước lớn, dễ vỡ hoặc cần đóng kiện riêng, shop sẽ trao đổi trước về phương án giao hàng.'
    ]
  },
  {
    title: 'Hủy đơn, đổi trả và hoàn tiền',
    body: [
      'Đơn pre-order đã đặt cọc thường không hỗ trợ hủy nếu shop đã giữ slot hoặc thanh toán cho đối tác.',
      'Nếu sản phẩm bị lỗi do vận chuyển hoặc sai thông tin so với đơn đã xác nhận, khách vui lòng liên hệ shop ngay khi nhận hàng.',
      'Chính sách đổi trả sẽ được xem xét theo tình trạng sản phẩm, video khui hàng và điều kiện của nhà cung cấp.'
    ]
  },
  {
    title: 'Kiểm tra sản phẩm khi nhận',
    body: [
      'Khách nên quay video khi mở kiện để shop có căn cứ hỗ trợ nếu phát sinh thiếu phụ kiện, bể vỡ hoặc sai sản phẩm.',
      'Vui lòng giữ lại hộp, phụ kiện và vật liệu đóng gói trong thời gian shop kiểm tra thông tin.',
      'Shop sẽ ưu tiên xử lý các trường hợp có hình ảnh, video và thông tin đơn hàng đầy đủ.'
    ]
  }
];

export default function PurchasePolicyPage() {
  return (
    <main className="policy-page">
      <Breadcrumb items={[{ label: 'Chính sách mua hàng' }]} />

      <section className="policy-hero">
        <p>Hỗ trợ khách hàng</p>
        <h1>Chính sách mua hàng</h1>
        <span aria-hidden="true" />
      </section>

      <section className="policy-shell" aria-label="Nội dung chính sách mua hàng">
        <aside className="policy-summary" aria-label="Tóm tắt chính sách">
          <strong>Hanbotorder</strong>
          <p>
            Shop nhận order figure, resin và mô hình sưu tầm. Mỗi đơn hàng sẽ được xác nhận rõ về giá,
            tiền cọc, tiền còn lại và tiến độ giao hàng trước khi xử lý.
          </p>
          <a href="tel:0966480510">Cần hỗ trợ: 0966480510</a>
        </aside>

        <div className="policy-content">
          <section className="policy-block">
            <h2>Quy trình đặt hàng</h2>
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
            <h2>Lưu ý quan trọng</h2>
            <p>
              Một số đơn resin, commission hoặc sản phẩm giới hạn có chính sách riêng theo nhà sản xuất.
              Khi có điều kiện đặc biệt, Hanbotorder sẽ thông báo riêng trong quá trình tư vấn và xác nhận đơn.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
