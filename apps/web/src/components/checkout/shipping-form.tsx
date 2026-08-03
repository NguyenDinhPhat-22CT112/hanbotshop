'use client';

import type { Address } from '../../lib/browser-api';

type CheckoutFields = {
    recipientName: string;
    recipientPhone: string;
    line1: string;
    city: string;
    province: string;
};

type ShippingFormProps = {
    fields: CheckoutFields;
    addresses: Address[];
    selectedAddressId: string;
    isLoading: boolean;
    isSubmitting: boolean;
    hasItems: boolean;
    message: string;
    onFieldUpdate: (key: keyof CheckoutFields, value: string) => void;
    onAddressSelect: (id: string) => void;
    onSubmit: () => void;
};

export function ShippingForm({
    fields,
    addresses,
    selectedAddressId,
    isLoading,
    isSubmitting,
    hasItems,
    message,
    onFieldUpdate,
    onAddressSelect,
    onSubmit
}: ShippingFormProps) {
    return (
        <div className="checkout-shipping-form">
            <div className="checkout-form-header">
                <h2>Thông tin giao hàng</h2>
                {addresses.length > 0 && (
                    <a href="/account/addresses" className="checkout-manage-link">
                        Quản lý địa chỉ
                    </a>
                )}
            </div>

            <form
                className="checkout-form"
                onSubmit={(event) => event.preventDefault()}
                aria-busy={isSubmitting || isLoading}
            >
                {addresses.length > 0 && (
                    <div className="form-field">
                        <label htmlFor="saved-address">Địa chỉ đã lưu</label>
                        <select
                            id="saved-address"
                            value={selectedAddressId}
                            onChange={(event) => onAddressSelect(event.target.value)}
                            className="form-select"
                        >
                            <option value="">Nhập địa chỉ mới</option>
                            {addresses.map((address) => (
                                <option value={address.id} key={address.id}>
                                    {address.recipient} - {address.line1}
                                    {address.isDefault ? ' (mặc định)' : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="form-row">
                    <div className="form-field">
                        <label htmlFor="recipientName">
                            Người nhận <span className="field-required">*</span>
                        </label>
                        <input
                            id="recipientName"
                            name="recipientName"
                            type="text"
                            value={fields.recipientName}
                            onChange={(event) => onFieldUpdate('recipientName', event.target.value)}
                            placeholder="Nhập tên người nhận"
                            autoComplete="name"
                            minLength={2}
                            required
                            className="form-input"
                        />
                    </div>

                    <div className="form-field">
                        <label htmlFor="recipientPhone">
                            Số điện thoại <span className="field-required">*</span>
                        </label>
                        <input
                            id="recipientPhone"
                            name="recipientPhone"
                            type="tel"
                            value={fields.recipientPhone}
                            onChange={(event) => onFieldUpdate('recipientPhone', event.target.value)}
                            placeholder="Nhập số điện thoại"
                            autoComplete="tel"
                            inputMode="tel"
                            pattern="[0-9+() .-]{6,20}"
                            required
                            className="form-input"
                        />
                    </div>
                </div>

                <div className="form-field">
                    <label htmlFor="line1">
                        Địa chỉ <span className="field-required">*</span>
                    </label>
                    <input
                        id="line1"
                        name="line1"
                        type="text"
                        value={fields.line1}
                        onChange={(event) => onFieldUpdate('line1', event.target.value)}
                        placeholder="Số nhà, tên đường"
                        autoComplete="street-address"
                        minLength={5}
                        required
                        className="form-input"
                    />
                </div>

                <div className="form-row">
                    <div className="form-field">
                        <label htmlFor="city">
                            Quận/Huyện <span className="field-required">*</span>
                        </label>
                        <input
                            id="city"
                            name="city"
                            type="text"
                            value={fields.city}
                            onChange={(event) => onFieldUpdate('city', event.target.value)}
                            placeholder="Nhập quận/huyện"
                            autoComplete="address-level2"
                            required
                            className="form-input"
                        />
                    </div>

                    <div className="form-field">
                        <label htmlFor="province">Tỉnh/Thành phố</label>
                        <input
                            id="province"
                            name="province"
                            type="text"
                            value={fields.province}
                            onChange={(event) => onFieldUpdate('province', event.target.value)}
                            placeholder="Nhập tỉnh/thành phố"
                            autoComplete="address-level1"
                            className="form-input"
                        />
                    </div>
                </div>

                <div className="form-field-checkbox">
                    <input
                        id="acceptedPolicies"
                        name="acceptedPolicies"
                        type="checkbox"
                        required
                        className="form-checkbox"
                    />
                    <label htmlFor="acceptedPolicies">
                        Tôi đã kiểm tra thông tin và đồng ý với{' '}
                        <a href="/chinh-sach/mua-hang">chính sách mua hàng</a>,{' '}
                        <a href="/chinh-sach/thanh-toan">thanh toán</a> và{' '}
                        <a href="/chinh-sach/doi-tra">hủy/đổi trả</a>.
                    </label>
                </div>

                <button
                    type="button"
                    disabled={isSubmitting || isLoading || !hasItems}
                    className="checkout-submit-button"
                    onClick={(event) => {
                        const form = event.currentTarget.form;
                        if (form && !form.checkValidity()) {
                            form.reportValidity();
                            return;
                        }
                        onSubmit();
                    }}
                >
                    {isSubmitting ? (
                        <>
                            <span className="button-spinner" />
                            <span>Đang xử lý...</span>
                        </>
                    ) : (
                        <>
                            <span>Xác nhận đặt hàng</span>
                            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </>
                    )}
                </button>

                {message && (
                    <div className="form-message" role="status" aria-live="polite">
                        {message}
                    </div>
                )}
            </form>
        </div>
    );
}
