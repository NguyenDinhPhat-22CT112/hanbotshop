import { Breadcrumb } from '../../components/breadcrumb';

export default function ContactPage() {
    return (
        <main>
            <Breadcrumb items={[{ label: 'Liên hệ' }]} />

            <section className="contact-page-header">
                <h1>Liên hệ với chúng tôi</h1>
                <p>Hanbotorder luôn sẵn sàng hỗ trợ bạn. Hãy liên hệ với shop qua các kênh dưới đây.</p>
            </section>

            <section className="contact-page-content">
                <div className="contact-info-grid">
                    <article className="contact-info-card">
                        <div className="contact-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                <circle cx="12" cy="10" r="3" />
                            </svg>
                        </div>
                        <h2>Địa chỉ</h2>
                        <p>Hồ Chí Minh, Việt Nam</p>
                        <p className="contact-note">Nhận order online và hỗ trợ giao hàng toàn quốc</p>
                    </article>

                    <article className="contact-info-card">
                        <div className="contact-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                            </svg>
                        </div>
                        <h2>Điện thoại</h2>
                        <p>
                            <a href="tel:0966480510" className="contact-link">
                                0966480510
                            </a>
                        </p>
                        <p className="contact-note">Hỗ trợ tư vấn và đặt hàng</p>
                    </article>

                    <article className="contact-info-card">
                        <div className="contact-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                <polyline points="22,6 12,13 2,6" />
                            </svg>
                        </div>
                        <h2>Email</h2>
                        <p>
                            <a href="mailto:thaomihi@gmail.com" className="contact-link">
                                thaomihi@gmail.com
                            </a>
                        </p>
                        <p className="contact-note">Phản hồi trong 24 giờ</p>
                    </article>

                    <article className="contact-info-card">
                        <div className="contact-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                            </svg>
                        </div>
                        <h2>Giờ làm việc</h2>
                        <p>Thứ 2 - Thứ 6: 9:00 - 18:00</p>
                        <p>Thứ 7 - Chủ nhật: 9:00 - 17:00</p>
                        <p className="contact-note">Nghỉ các ngày lễ tết</p>
                    </article>
                </div>

                <div className="contact-form-section">
                    <div className="contact-form-intro">
                        <h2>Gửi tin nhắn cho chúng tôi</h2>
                        <p>
                            Bạn có câu hỏi về sản phẩm, đơn hàng, hoặc cần tư vấn? Điền form bên dưới và shop sẽ phản hồi trong thời gian sớm nhất.
                        </p>
                    </div>

                    <form className="contact-form" action="/api/contact" method="post">
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="name">Họ và tên *</label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    required
                                    placeholder="Nguyễn Văn A"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="email">Email *</label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    required
                                    placeholder="example@email.com"
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="phone">Số điện thoại</label>
                                <input
                                    type="tel"
                                    id="phone"
                                    name="phone"
                                    placeholder="0901234567"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="subject">Chủ đề</label>
                                <select id="subject" name="subject">
                                    <option value="general">Câu hỏi chung</option>
                                    <option value="order">Đơn hàng</option>
                                    <option value="product">Sản phẩm</option>
                                    <option value="shipping">Giao hàng</option>
                                    <option value="payment">Thanh toán</option>
                                    <option value="other">Khác</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="message">Tin nhắn *</label>
                            <textarea
                                id="message"
                                name="message"
                                rows={6}
                                required
                                placeholder="Nhập nội dung tin nhắn của bạn..."
                            />
                        </div>

                        <button type="submit" className="contact-submit-btn">
                            Gửi tin nhắn
                        </button>
                    </form>
                </div>

                <div className="contact-social-section">
                    <h2>Kết nối với chúng tôi</h2>
                    <div className="contact-social-grid">
                        <a href="mailto:thaomihi@gmail.com" className="social-link email">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                            </svg>
                            <span>Email</span>
                        </a>
                    </div>
                </div>
            </section>
        </main>
    );
}
