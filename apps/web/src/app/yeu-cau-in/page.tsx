import type { Metadata } from 'next';
import { PrintRequestForm } from '../../components/print-request-form';
export default function PrintRequestPage(){return <main className="print-request-page"><header><p className="eyebrow">Dịch vụ in theo yêu cầu</p><h1>Gửi mẫu bạn muốn được in</h1><span>Cho Hanbotorder biết ý tưởng, kích thước và hình ảnh tham khảo. Shop sẽ kiểm tra khả năng thực hiện trước khi gửi báo giá.</span></header><PrintRequestForm/></main>}
export const metadata:Metadata={title:'Yêu cầu in mô hình',description:'Gửi thông tin và hình ảnh mẫu cần in tới Hanbotorder.',alternates:{canonical:'/yeu-cau-in'}};
