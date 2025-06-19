# GameVault Web

Một nền tảng thương mại điện tử chủ đề neon dành cho game thủ để mua bán vật phẩm trong game, nạp tiền và quản lý tài khoản. Được xây dựng bằng HTML, CSS và JavaScript, với thiết kế responsive và lưu trữ dữ liệu phía client bằng `localStorage`.

## Tính năng
- **Xác thực người dùng**: Đăng ký, đăng nhập, quản lý hồ sơ người dùng.
- **Duyệt sản phẩm**: Xem và mua vật phẩm cho các game như Roblox, Free Fire, Liên Quân Mobile.
- **Giỏ hàng & Thanh toán**: Thêm sản phẩm vào giỏ và xử lý thanh toán (giả lập).
- **Hệ thống nạp tiền**: Hỗ trợ thanh toán bằng thẻ, ngân hàng, ví điện tử và thẻ tín dụng, cần admin duyệt.
- **Bảng quản trị**: Quản lý sản phẩm, game, banner và giao dịch (chỉ dành cho admin).
- **Giao diện sáng/tối**: Chuyển đổi theme với cài đặt lưu trữ.
- **Responsive**: Tối ưu cho cả mobile và desktop.

## Công nghệ
- **Frontend**: HTML5, CSS3 (kiểu neon tùy chỉnh), JavaScript (ES6+)
- **Lưu trữ**: `localStorage` cho dữ liệu người dùng và ứng dụng
- **Font**: Orbitron (tải từ Google Fonts hoặc local assets)
- **Triển khai**: GitHub Pages

## Cài đặt
1. **Clone repository**:
   ```bash
   git clone https://github.com/ten-ban/gamevault-web.git
   cd gamevault-web
   ```
2. **Mở `index.html`** trong trình duyệt hoặc chạy server cục bộ:
   ```bash
   npx http-server
   ```
3. **Triển khai lên GitHub Pages** (xem bên dưới).

## Triển khai
Website được host trên GitHub Pages:
1. Push tất cả file lên nhánh `main`.
2. Vào **Settings > Pages** trong repository GitHub.
3. Chọn **Source** là nhánh `main` và thư mục `/ (root)`.
4. Truy cập site tại `https://ten-ban.github.io/gamevault-web`.

## Lưu trữ dữ liệu
- **Hiện tại**: Dùng `localStorage` để lưu trữ dữ liệu phía client (người dùng, giỏ hàng, sản phẩm, giao dịch).
- **Tương lai**: Xem xét tích hợp backend (như Firebase, Node.js với MongoDB) để lưu trữ server-side. Xem [Cải tiến tương lai](#cai-tien-tuong-lai).

## Cải tiến tương lai
- Thêm API backend để lưu trữ dữ liệu lâu dài.
- Tích hợp cổng thanh toán thực (như Stripe, PayPal).
- Tăng cường bảo mật cho xác thực admin và dữ liệu người dùng.
- Thêm unit test cho các hàm JavaScript.
- Tối ưu hình ảnh và tài nguyên để tải nhanh hơn.

## Đóng góp
1. Fork repository.
2. Tạo nhánh tính năng (`git checkout -b feature/ten-tinh-nang`).
3. Commit thay đổi (`git commit -m "Thêm tính năng XYZ"`).
4. Push lên nhánh (`git push origin feature/ten-tinh-nang`).
5. Tạo Pull Request.

## Giấy phép
MIT License (xem file `LICENSE` nếu có).

## Liên hệ
Nếu có vấn đề hoặc góp ý, hãy mở issue trên GitHub hoặc liên hệ [email-cua-ban@example.com].