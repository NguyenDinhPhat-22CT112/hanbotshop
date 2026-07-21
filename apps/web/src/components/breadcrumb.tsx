type BreadcrumbItem = {
    label: string;
    href?: string;
};

type BreadcrumbProps = {
    items: BreadcrumbItem[];
};

export function Breadcrumb({ items }: BreadcrumbProps) {
    return (
        <nav className="breadcrumb" aria-label="Đường dẫn">
            <a href="/">Trang chủ</a>
            {items.map((item, index) => (
                <span key={index}>
                    <span className="breadcrumb-separator">/</span>
                    {item.href ? (
                        <a href={item.href}>{item.label}</a>
                    ) : (
                        <span className="breadcrumb-current">{item.label}</span>
                    )}
                </span>
            ))}
        </nav>
    );
}
