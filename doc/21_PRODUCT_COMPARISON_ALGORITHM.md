# Thuật toán So sánh Sản phẩm (Product Comparison Algorithm)

Tài liệu này quy định logic xử lý khi người dùng yêu cầu so sánh hai sản phẩm cùng loại trong hệ thống DICO Scan.

## 1. Quy trình xử lý (Execution Flow)

1.  **Input:** `barcode_A`, `barcode_B`, `user_id`.
2.  **Khởi tạo:** Tải dữ liệu đầy đủ của 2 sản phẩm từ Database (hoặc API vendor nếu cache miss).
3.  **Kiểm tra tính tương đồng (Compatibility Check):**
    *   Nếu `category_A != category_B`: Trả về lỗi "Chỉ có thể so sánh các sản phẩm trong cùng danh mục".
4.  **Trích xuất đặc tính (Feature Extraction):** Phân tích thành phần dựa trên từng Category.
5.  **So sánh định lượng (Quantitative Comparison):** So sánh các chỉ số Score, Rating, Dinh dưỡng/Vật liệu.
6.  **Phân tích định tính bằng AI (Qualitative AI Analysis):** Gọi Gemini AI để tóm tắt sự khác biệt về công dụng/thành phần.
7.  **Output:** Trả về JSON chứa bảng so sánh rút gọn.

---

## 2. Logic So sánh theo từng Danh mục

### **2.1. BEAUTY (Mỹ phẩm)**
*   **Trọng tâm:** Thành phần hoạt tính (Active Ingredients) và Công dụng chính.
*   **Thuật toán so sánh:**
    *   **Phân nhóm thành phần:** Group các chất vào các nhóm tính năng (Dưỡng ẩm, Chống nắng, Trị mụn, Làm sáng).
    *   **Điểm khác biệt:** 
        *   Sản phẩm 1 có chất X, Y (Dưỡng ẩm) -> Ghi nhận "Thế mạnh: Dưỡng ẩm sâu".
        *   Sản phẩm 2 có chất Z (Chống nắng) -> Ghi nhận "Thế mạnh: Bảo vệ da".
    *   **Cảnh báo:** So sánh danh sách chất gây kích ứng giữa 2 bên.

### **2.2. FOOD (Thực phẩm)**
*   **Trọng tâm:** Bảng thành phần dinh dưỡng (Nutriments) và Phụ gia (Additives).
*   **Thuật toán so sánh:**
    *   **Delta Metrics:** Tính toán chênh lệch (Δ) Calorie, Đường, Muối, Chất béo trên 100g.
    *   **Chỉ số chế biến:** So sánh Nova group (Vd: Sp A ít chế biến hơn Sp B).
    *   **Phụ gia rủi ro:** So sánh số lượng phụ gia rủi ro cao/trung bình.

### **2.3. TOY (Đồ chơi)**
*   **Trọng tâm:** Vật liệu (Materials) và Độ an toàn.
*   **Thuật toán so sánh:**
    *   So sánh vật liệu chính (Nhựa vs Gỗ, BPA-free).
    *   So sánh độ giới hạn tuổi (Age Limit).

---

## 3. Cấu trúc Prompt cho AI Comparison

Để đạt được kết quả ngắn gọn như yêu cầu, AI Prompt sẽ được thiết kế như sau:

> **Role:** Chuyên gia kỹ thuật sản phẩm DICO.
> **Task:** So sánh cực ngắn gọn sự khác biệt giữa SP A (%s) và SP B (%s) thuộc ngành %s.
> **Context:** 
> - Thành phần A: %s
> - Thành phần B: %s
> **Constraint:** 
> 1. Không khen ngợi, chỉ phân tích sự khác biệt về mặt thành phần/công dụng.
> 2. Định dạng: "SP A tốt về [X], nhưng SP B vượt trội về [Y]."
> 3. Độ dài tối đa: 40 từ.

---

## 4. Cấu trúc Response JSON (Dự kiến)

```json
{
  "comparisonSummary": "Sản phẩm A tập trung vào dưỡng ẩm với HA, trong khi Sản phẩm B tối ưu chống nắng với Zinc Oxide nhưng kém hơn về độ ẩm.",
  "sideBySide": {
    "score": {"productA": 85, "productB": 78},
    "keyStrengths": {
      "productA": ["Dưỡng ẩm sâu", "Organic"],
      "productB": ["Chống nắng vật lý", "Kiểm soát dầu"]
    },
    "riskIngredients": {
      "productA": ["Paraben (Chất bảo quản)"],
      "productB": ["Alcohol (Gây khô da)"]
    }
  }
}
```

## 5. Lộ trình Triển khai
1. [ ] Cập nhật Mapping Database cho các nhóm chất hoạt tính (Active Ingredients mapping).
2. [ ] Xây dựng Endpoint `POST /v1/products/compare?a={barcode1}&b={barcode2}`.
3. [ ] Tích hợp Gemini prompt rút gọn cho Comparison.
