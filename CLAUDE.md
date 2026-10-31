@AGENTS.md

## Ảnh trong bài blog

Mỗi bài blog mới (và mỗi bài viết lại) có 3 đến 4 ảnh chụp thật miễn phí (chủ nâng từ 2-3 lên 3-4 ngày 31/10/2026, W-3755; bốn bài nỗi đau cũ có 3), theo luật của chủ (`learn/article-photos.md` trong Brain). Đồ hoạ tự vẽ không thay được ảnh.

- Nguồn: Wikimedia Commons, Unsplash, Pexels hoặc Pixabay; kiểm giấy phép từng ảnh (CC0, CC BY, CC BY-SA, Unsplash License, Pexels License). Không lấy ảnh từ Google Images, mạng xã hội hay trang không có giấy phép rõ.
- Ảnh đúng nội dung bài, đặt ở chỗ có nghĩa cạnh đồ hoạ (khối `image` trong `src/lib/blog-posts/<slug>.ts`).
- Ghi tác giả và giấy phép trong `credit`, link về trang ảnh trong `creditHref`; có `alt` mô tả đúng nội dung.
- Mỗi ảnh dưới 200 KB (WebP và AVIF, 1100x619, tải lười để trang không nhảy); số từ bài giữ 3.500 đến 4.000.
- Ảnh có người ghi "Illustrative photo, not a Tutafy user". Không dùng ảnh người mẫu làm ra vẻ gia sư hay khách thật của Tutafy, không gắn với lời chứng thực hay số đánh giá.
- Cách làm: ghi danh sách vào `scripts/_commons-batch.json`, chạy `node scripts/fetch-commons-photos.mjs scripts/_commons-batch.json` (tải từ Wikimedia Commons, đọc giấy phép từ trang ảnh, nén dưới 200 KB, ghi `public/blog/inline/credits.json`). Ảnh từ nguồn khác thì nén cùng cỡ và tự ghi vào `credits.json`.
- Kiểm tra tự động: `tests/blog-photos.test.ts` (bốn bài nỗi đau có 2 đến 3 ảnh, bài mới có 3 đến 4 ảnh, credit có tác giả và giấy phép, link nguồn, bản ghi giấy phép, hai tệp dưới 200 KB). Khi thêm bài mới, thêm bài đó vào test này.
- Độ dài: mỗi bài traffic dài 3.500 đến 4.000 từ, đếm bằng `node --experimental-test-module-mocks --disable-warning=ExperimentalWarning --import ./tests/register.mjs scripts/count-post-words.mjs <slug> --sections`; `tests/blog-length.test.ts` giữ giới hạn (thêm bài mới vào danh sách trong test).
