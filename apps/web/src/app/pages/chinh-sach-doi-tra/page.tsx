import type { Metadata } from 'next';
import { Breadcrumb } from '../../../components/breadcrumb';

export const metadata: Metadata = {
  title: 'Chính sách đổi trả và hoàn tiền | Hanbotorder',
  description: 'Điều kiện đổi trả, kiểm tra hàng và quy trình hoàn tiền tại Hanbotorder.'
};

const steps = [
  {
    title: '1. Kiểm tra khi nhận',
    text: 'Khách nên kiểm tra ngoại quan kiện hàng và quay video quá trình khui hộp để shop có căn cứ hỗ trợ khi có phát sinh.'
  },
  {
    title: '2. Báo shop sớm',
    text: 'Nếu sản phẩm sai mẫu, thiếu phụ kiện hoặc có hư hỏng rõ ràng, vui lòng liên hệ Hanbotorder trong thời gian sớm nhất sau khi nhận hàng.'
  },
  {
    title: '3. Đối chiếu thông tin',
    text: 'Shop sẽ kiểm tra video, hình ảnh, mã đơn và điều kiện từ nhà cung cấp hoặc đơn vị vận chuyển trước khi đưa phương án xử lý.'
  },
  {
    title: '4. Hoàn tất hỗ trợ',
    text: 'Tùy từng trường hợp, shop sẽ hỗ trợ đổi sản phẩm, bổ sung phụ kiện, bồi hoàn một phần hoặc hoàn tiền theo thỏa thuận.'
  }
];

const policies = [
  {
    title: 'Điều kiện hỗ trợ đổi trả',
    body: [
      'Sản phẩm nhận được không đúng mẫu, sai phiên bản hoặc sai thông tin đã được shop xác nhận trước đó.',
      'Sản phẩm bị hư hỏng nghiêm trọng do quá trình vận chuyển và có video khui hàng đầy đủ.',
      'Sản phẩm thiếu phụ kiện, part hoặc phần đi kèm theo thông tin từ nhà sản xuất.'
    ]
  },
  {
    title: 'Trường hợp không hỗ trợ đổi trả',
    body: [
      'Sản phẩm đã qua sử dụng, tự ý sửa chữa, sơn lại, dán keo hoặc làm thay đổi tình trạng ban đầu.',
      'Các lỗi nhỏ đặc thù của hàng sưu tầm như lệch màu nhẹ, vết khuôn nhỏ hoặc sai số sản xuất nằm trong mức nhà sản xuất chấp nhận.',
      'Đơn pre-order hoặc resin đã đặt cọc nhưng khách đổi ý sau khi shop đã giữ slot, thanh toán hoặc bắt đầu xử lý đơn.'
    ]
  },
  {
    title: 'Chính sách hoàn tiền',
    body: [
      'Khoản hoàn tiền sẽ được xử lý sau khi shop xác nhận đủ điều kiện và thống nhất phương án với khách.',
      'Với đơn đã thanh toán qua chuyển khoản, tiền hoàn sẽ được chuyển lại về tài khoản do khách cung cấp.',
      'Thời gian hoàn tiền phụ thuộc vào phương thức thanh toán và quá trình xác minh tình trạng sản phẩm.'
    ]
  }
];

export default function ReturnPolicyPage() {
  return (
    <main className="policy-page">
      <Breadcrumb items={[{ label: 'Chính sách đổi trả' }]} />

      <section className="policy-hero">
        <p>Hỗ trợ sau mua</p>
        <h1>Chính sách đổi trả và hoàn tiền</h1>
        <span aria-hidden="true" />
      </section>

      <section className="policy-shell" aria-label="Nội dung chính sách đổi trả">
        <aside className="policy-summary" aria-label="Tóm tắt chính sách đổi trả">
          <strong>Ưu tiên minh bạch</strong>
          <p>
            Hanbotorder hỗ trợ xử lý các vấn đề phát sinh dựa trên tình trạng thực tế, video khui hàng
            và thông tin đơn đã xác nhận với khách.
          </p>
          <a href="mailto:hann34567890@gmail.com">Gửi hình ảnh/video hỗ trợ</a>
        </aside>

        <div className="policy-content">
          <section className="policy-block">
            <h2>Quy trình xử lý</h2>
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
              Với figure, resin hoặc hàng đặt trước, điều kiện đổi trả có thể phụ thuộc thêm vào chính sách
              của nhà sản xuất, nhà cung cấp hoặc đơn vị vận chuyển.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
