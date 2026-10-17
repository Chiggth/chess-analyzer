# Chess Analyzer — hướng dẫn dùng trên điện thoại

Website tĩnh để nhập PGN, xem bàn cờ dạng 8×8 và phân tích bằng Stockfish trong trình duyệt.

## 1. Tệp trong dự án
- `index.html`: giao diện.
- `style.css`: theme tối kiểu Chess.com, bàn cờ ô vuông đồng đều, bố cục điện thoại.
- `app.js`: đọc PGN, điều hướng nước đi và gọi Stockfish.
- `engine/`: cần đặt hai tệp Stockfish vào đây.

## 2. Tích hợp Stockfish (bắt buộc)
Dự án không kèm tệp engine WASM lớn. Tải bản phát hành chính thức từ:
https://github.com/nmrugg/stockfish.js

Cần dùng cùng phiên bản và đặt đúng hai tệp sau vào thư mục `engine/`:
- `stockfish-19-lite-single.js`
- `stockfish-19-lite-single.wasm`

Trong GitHub trên điện thoại:
1. Mở repository của website.
2. Tạo thư mục `engine` (GitHub không tạo thư mục rỗng; tải tệp có đường dẫn `engine/ten-tep`).
3. Tải hai tệp engine từ bản phát hành/npm chính thức rồi upload vào `engine/`.
4. Giữ nguyên tên tệp. Tệp JS và WASM phải nằm cạnh nhau để engine tìm được WASM.
5. Commit thay đổi rồi chờ GitHub Pages/Render deploy xong.

Nếu bản tải về dùng tên khác, đổi tên hai tệp theo đúng tên ở trên hoặc sửa dòng `new Worker("engine/stockfish-19-lite-single.js")` trong `app.js` cho khớp. Tệp WASM phải có cùng tiền tố tương ứng.

## 3. Chạy miễn phí bằng GitHub Pages
1. Tải toàn bộ `index.html`, `style.css`, `app.js` lên thư mục gốc repository.
2. Tải hai tệp Stockfish vào `engine/`.
3. Vào Settings → Pages → Build and deployment → Deploy from a branch → chọn `main` và `/(root)`.
4. Mở URL GitHub Pages bằng Chrome. Dùng HTTPS, không mở `index.html` trực tiếp từ bộ nhớ điện thoại.
5. Lần đầu engine tải có thể hơi lâu. Sau đó nhập PGN và nhấn “Phân tích ván cờ”.

## 4. Nhập ván cờ
- Cách ổn định: tải/xuất PGN từ Chess.com, rồi chọn tệp `.pgn` trong website.
- Có thể thử dán link Chess.com, nhưng trình duyệt có thể chặn yêu cầu do CORS hoặc trang không cung cấp PGN trực tiếp. Khi đó hãy dùng tệp PGN.
- Có thể dán trực tiếp nội dung PGN vào ô văn bản.

## 5. Lưu ý
- Bản mặc định dùng `lite single-threaded` để tương thích hosting tĩnh và điện thoại, không cần SharedArrayBuffer. Bản Lite nhẹ hơn nhưng yếu hơn bản Full.
- Phân tích hiện dùng depth 10 để hạn chế tải CPU/pin. Có thể tăng `runPosition(positions[ply], 10)` trong `app.js` lên 12–14 nếu điện thoại chạy ổn.
- Nhãn sai lầm hiện là phân loại đơn giản từ thay đổi điểm đánh giá, chưa tương đương hệ thống Game Review của Chess.com.
- Stockfish.js được cấp phép GPL-3.0. Khi phân phối, hãy giữ thông tin giấy phép và tuân thủ nghĩa vụ GPL, gồm cung cấp mã nguồn tương ứng theo điều kiện giấy phép. Xem `Copying.txt` trong dự án Stockfish.js.
- chess.js được dùng từ CDN công khai; nếu muốn hoạt động ngoại tuyến hoàn toàn, cần tải và tự host thư viện này.
