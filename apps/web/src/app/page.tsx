import type { ProductCardModel } from '../lib/models';
import { getProducts } from '../lib/api';

const categoryLinks=[
 {label:'Đặt trước',note:'Sản phẩm sắp phát hành',href:'/collections/tat-ca-san-pham?availability=PRE_ORDER'},
 {label:'Order',note:'Figure & statue theo yêu cầu',href:'/order'},
 {label:'Resin',note:'Mô hình resin sưu tầm',href:'/resin'}
];

export default async function HomePage(){
 const [orderResult,resinResult]=await Promise.all([
  getProducts({availability:'ORDER',pageSize:10}).catch(()=>null),
  getProducts({tags:['resin'],pageSize:10}).catch(()=>null)
 ]);
 return <main className="home-page">
  <section className="home-hero"><div className="home-hero-copy"><p className="eyebrow">Collectibles · Pre-order · Resin figure</p><h1>Mẫu sưu tầm dành cho người thật sự yêu figure.</h1><p>Hanbotorder giúp bạn tìm, đặt trước và theo dõi những mẫu figure đáng sở hữu — với thông tin rõ ràng trong từng giai đoạn.</p><div className="hero-actions"><a href="/order">Xem sản phẩm Order</a><a href="/yeu-cau-in">Gửi yêu cầu in</a></div><div className="home-trust"><span><b>01</b>Tư vấn trước khi đặt</span><span><b>02</b>Cập nhật tiến độ</span><span><b>03</b>Đóng gói cẩn thận</span></div></div><div className="home-hero-art" aria-hidden="true"><span>HANBOT</span><strong>COLLECTORS’<br/>SELECTION</strong><i>EST. 2026</i></div></section>
  <section className="home-category-wrap" aria-labelledby="category-heading"><div className="home-section-intro"><div><p className="eyebrow">Tìm đúng sản phẩm</p><h2 id="category-heading">Khám phá theo nhu cầu</h2></div><a href="/collections/tat-ca-san-pham">Xem toàn bộ →</a></div><div className="category-strip">{categoryLinks.map((category,index)=><a href={category.href} key={category.label}><small>0{index+1}</small><strong>{category.label}</strong><span>{category.note}</span><i>↗</i></a>)}</div></section>
  <ProductShowcase title="Sản phẩm Order" eyebrow="Figure & Statue" href="/order" products={orderResult?.data??[]} unavailable={!orderResult}/>
  <ProductShowcase title="Sản phẩm Resin" eyebrow="Resin Collection" href="/resin" products={resinResult?.data??[]} unavailable={!resinResult} tone="resin"/>
  <section className="home-order-guide"><div><p className="eyebrow">Quy trình minh bạch</p><h2>Từ mẫu bạn thích đến khi nhận hàng</h2><p>Mỗi đơn đều có trạng thái rõ ràng để bạn chủ động theo dõi.</p></div><ol><li><b>1</b><strong>Chọn sản phẩm</strong><span>Xem tình trạng, giá và thời gian dự kiến.</span></li><li><b>2</b><strong>Xác nhận đơn</strong><span>Shop kiểm tra thông tin và yêu cầu thanh toán.</span></li><li><b>3</b><strong>Theo dõi tiến độ</strong><span>Cập nhật xuyên suốt quá trình xử lý.</span></li><li><b>4</b><strong>Nhận hàng</strong><span>Kiểm tra và đóng gói kỹ trước khi giao.</span></li></ol></section>
  <section className="service-band home-services"><article><strong>Thông tin rõ ràng</strong><span>Giá, tình trạng và yêu cầu đặt cọc hiển thị trước khi đặt.</span></article><article><strong>Hỗ trợ từ người thật</strong><span>Trao đổi trực tiếp khi bạn cần tìm mẫu hoặc xác nhận chi tiết.</span></article><article><strong>Dành cho collector</strong><span>Quy trình nhận, kiểm tra và đóng gói phù hợp với sản phẩm sưu tầm.</span></article></section>
 </main>;
}

function ProductShowcase({title,eyebrow,href,products,unavailable,tone='order'}:{title:string;eyebrow:string;href:string;products:ProductCardModel[];unavailable:boolean;tone?:'order'|'resin'}){
 return <section className={`home-showcase home-showcase--${tone}`}><header><p>{eyebrow}</p><h2>{title}</h2></header>{products.length?<div className="home-showcase-grid">{products.slice(0,10).map(product=><HomeProductCard product={product} key={product.id}/>)}</div>:<div className="home-showcase-empty"><strong>{unavailable?'Chưa tải được sản phẩm.':'Chưa có sản phẩm trong danh mục này.'}</strong><span>{unavailable?'Vui lòng thử lại sau ít phút.':'Sản phẩm mới sẽ xuất hiện tại đây sau khi được đăng từ admin.'}</span></div>}<a className="home-showcase-more" href={href}>Xem thêm {title} →</a></section>
}

function HomeProductCard({product}:{product:ProductCardModel}){
 return <article className="home-product-card"><a className={`home-product-image product-image--${product.imageTone}`} href={`/products/${product.slug}`}>{product.imageUrl?<img src={product.imageUrl} alt={product.name} loading="lazy"/>:<span>{product.category}</span>}<i>{product.status==='PRE_ORDER'?'Pre-order':product.status==='ORDER'?'Order':product.status==='CONTACT'?'Liên hệ':product.status}</i></a><p>{product.studio}</p><h3><a href={`/products/${product.slug}`}>{product.name}</a></h3><div><strong>{product.price}</strong></div></article>
}
