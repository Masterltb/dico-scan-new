# DICO Scan — Tài liệu Yêu cầu B2B

> Phiên bản: 1.0 | Ngày: 2026-03-20

---

## 1. Tổng quan hệ thống

DICO Scan B2B là nền tảng quét mã vạch sản phẩm dành cho doanh nghiệp, cho phép doanh nghiệp (khách hàng B2B) cấu hình danh mục sản phẩm riêng và cung cấp thông tin sản phẩm cho khách hàng cuối (end-user) khi quét mã vạch.

---

## 2. Hai Mô Hình Kinh Doanh

### 2.1 Mô hình 1 — SaaS / Cloud Deployment

```
Doanh nghiệp → Đăng ký gói B2B → Nhập sản phẩm (manual / Excel) → Cloud của DICO
Khách hàng cuối → Quét mã → App gọi Cloud → Hiển thị thông tin sản phẩm
```

| Hạng mục | Chi tiết |
|---|---|
| **Hạ tầng** | Do DICO vận hành trên cloud (AWS / GCP) |
| **Mô hình thanh toán** | Subscription theo tháng/năm, tính theo số sản phẩm và số lượt quét |
| **Onboarding** | Tự phục vụ qua web portal |
| **SLA** | 99.9% uptime, hỗ trợ qua ticket |
| **Phù hợp với** | SME, chuỗi bán lẻ vừa và nhỏ, startup |

### 2.2 Mô hình 2 — On-Premise / Bán phần cứng + phần mềm

```
Doanh nghiệp → Mua license + server vật lý/VM → DICO cài đặt tại chỗ
Khách hàng cuối → Quét mã → App gọi server nội bộ → Hiển thị thông tin
```

| Hạng mục | Chi tiết |
|---|---|
| **Hạ tầng** | Server do doanh nghiệp sở hữu hoặc DICO cung cấp |
| **Mô hình thanh toán** | License one-time + phí bảo trì hàng năm (10-20% giá license) |
| **Onboarding** | DICO kỹ thuật viên cài đặt tại doanh nghiệp |
| **SLA** | Hợp đồng bảo trì riêng, hỗ trợ on-site |
| **Phù hợp với** | Doanh nghiệp lớn, yêu cầu bảo mật dữ liệu nội bộ, ngành y tế / thực phẩm |

---

## 3. Luồng nghiệp vụ cốt lõi

### 3.1 Doanh nghiệp nhập sản phẩm

```
┌──────────────────────────────────────────────────────┐
│              ADMIN PORTAL (B2B Dashboard)             │
│                                                      │
│  [Nhập thủ công]    [Import Excel / CSV]             │
│       │                     │                        │
│       └──────────┬──────────┘                        │
│                  ▼                                   │
│         Validate barcode + dữ liệu                   │
│                  │                                   │
│         Lưu vào B2B Product Catalog                  │
│         (namespace riêng cho từng doanh nghiệp)      │
└──────────────────────────────────────────────────────┘
```

**Trường dữ liệu sản phẩm B2B cần nhập:**

| Trường | Bắt buộc | Mô tả |
|--------|----------|-------|
| `barcode` | ✅ | Mã barcode / QR code |
| `name` | ✅ | Tên sản phẩm |
| `ingredients` | ✅ | Thành phần / nguyên liệu (text hoặc JSON array) |
| `description` | ✅ | Mô tả chung sản phẩm |
| `category` | ✅ | Danh mục (thực phẩm, mỹ phẩm, đồ dùng…) |
| `manufacturer` | ❌ | Nhà sản xuất |
| `origin` | ❌ | Xuất xứ |
| `expiry_note` | ❌ | Ghi chú hạn sử dụng / cách đọc date |
| `warnings` | ❌ | Cảnh báo dị ứng / lưu ý |
| `image_url` | ❌ | Ảnh sản phẩm |
| `custom_fields` | ❌ | Trường tự do, JSON (doanh nghiệp tự định nghĩa) |

### 3.2 Khách hàng cuối quét mã vạch

```
Khách hàng mở app → Quét barcode
        │
        ▼
App gửi request: GET /b2b/scan?barcode=XXX&tenant=TENANT_ID
        │
        ▼
Server tra cứu B2B Catalog của tenant
        │
        ├── Tìm thấy → Trả về thông tin sản phẩm
        │
        └── Không tìm thấy → Báo "sản phẩm không có trong hệ thống"
```

---

## 4. Kiến trúc hệ thống B2B

### 4.1 Multi-Tenancy

Mỗi doanh nghiệp (tenant) có **namespace độc lập** trong database:

```
tenant_id (UUID) → isolate catalog, user, analytics
```

- **Model 1 (Cloud)**: Shared DB với row-level isolation theo `tenant_id`
- **Model 2 (On-premise)**: Mỗi doanh nghiệp có DB riêng, deploy riêng

### 4.2 Sơ đồ module

```
┌─────────────────────────────────────────────────────┐
│                  B2B Admin Portal (Web)              │
│  - Quản lý sản phẩm       - Phân quyền user         │
│  - Import Excel/CSV        - Xem analytics          │
│  - Tùy chỉnh branding      - Quản lý gói dịch vụ   │
└───────────────────────┬─────────────────────────────┘
                        │ REST API
┌───────────────────────▼─────────────────────────────┐
│                 B2B Backend (Spring Boot)            │
│                                                     │
│  TenantResolver  │  ProductCatalogService           │
│  AuthService     │  ImportService (Excel/CSV)        │
│  AnalyticsService│  ScanResolutionService           │
│                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │ PostgreSQL  │  │    Redis    │  │  MinIO/S3   │ │
│  │ (catalog)   │  │  (cache)    │  │  (images)   │ │
│  └─────────────┘  └─────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────┘
                        │ REST API
┌───────────────────────▼─────────────────────────────┐
│              Mobile App (React Native / Expo)        │
│  - Scanner screen         - Kết quả quét B2B        │
│  - Branding theo tenant   - Offline cache           │
└─────────────────────────────────────────────────────┘
```

---

## 5. Yêu cầu chức năng chi tiết

### 5.1 Module Quản lý sản phẩm (Admin Portal)

#### 5.1.1 Nhập thủ công (Manual Entry)
- Form nhập từng sản phẩm
- Validate trùng barcode trong catalog của tenant
- Hỗ trợ rich text cho trường `ingredients` và `description`
- Doanh nghiệp nhập toàn bộ thông tin thủ công, không phụ thuộc nguồn nào khác

#### 5.1.2 Import hàng loạt (Bulk Import)
- Upload file `.xlsx`, `.xls`, `.csv`
- Mapping cột linh hoạt (doanh nghiệp chọn cột nào = trường nào)
- Preview dữ liệu trước khi import
- Báo cáo lỗi sau import (dòng nào sai, thiếu trường gì)
- Giới hạn batch: tối đa 10.000 sản phẩm / lần upload
- Background job cho file lớn, thông báo email khi hoàn tất

#### 5.1.3 Quản lý catalog
- CRUD sản phẩm
- Tìm kiếm / lọc theo tên, barcode, danh mục
- Lịch sử thay đổi (audit log)
- Xuất catalog ra Excel/CSV

### 5.2 Module Scan Resolution

Khi khách hàng cuối quét mã, hệ thống giải quyết theo thứ tự ưu tiên:

```
Lookup: B2B Catalog của tenant
    → Tìm thấy   : Trả về thông tin sản phẩm
    → Không thấy : Trả về lỗi 404 "sản phẩm không có trong hệ thống"
```

> **Nguyên tắc**: Mỗi tenant quản lý catalog **độc lập hoàn toàn**.
> Không có fallback sang database global. Dữ liệu hiển thị 100% do doanh nghiệp nhập vào.

### 5.3 Module Phân quyền

| Role | Quyền |
|------|-------|
| `TENANT_ADMIN` | Toàn quyền quản lý catalog, user, analytics |
| `TENANT_EDITOR` | Nhập/sửa sản phẩm |
| `TENANT_VIEWER` | Xem catalog, xuất báo cáo |
| `END_USER` | Chỉ quét và xem kết quả |

### 5.4 Module Analytics (Dashboard)

- Số lượt quét theo ngày/tuần/tháng
- Sản phẩm được quét nhiều nhất
- Tỉ lệ hit (tìm thấy) vs miss (không tìm thấy)
- Thiết bị / địa điểm quét (nếu user cho phép)

---

## 6. Yêu cầu phi chức năng

| Hạng mục | Model 1 (Cloud) | Model 2 (On-premise) |
|----------|-----------------|----------------------|
| **Availability** | 99.9% | Theo hợp đồng |
| **Scan latency** | < 300ms (p95) | < 100ms (nội mạng) |
| **Catalog size** | 100K sp / tenant | Không giới hạn |
| **Concurrent users** | 1.000 / tenant | Theo cấu hình server |
| **Data isolation** | Row-level (shared DB) | Physical DB riêng |
| **Backup** | Daily snapshot | Theo hợp đồng |
| **Offline** | Cache 1.000 sp cuối | Toàn bộ catalog |

---

## 7. API Design (Scan Endpoint)

### 7.1 Public Scan API

```http
GET /api/b2b/v1/scan
Headers:
  X-Tenant-ID: {tenant_id}
  Authorization: Bearer {end_user_token}

Query:
  barcode: string (required)

Response 200:
{
  "found": true,
  "product": {
    "barcode": "8934868123456",
    "name": "Sữa tươi Vinamilk 1L",
    "category": "Thực phẩm",
    "description": "Sữa tươi tiệt trùng có đường...",
    "ingredients": ["Sữa bò tươi", "Đường", "Vitamin D3"],
    "warnings": ["Chứa lactose"],
    "manufacturer": "Vinamilk",
    "origin": "Việt Nam",
    "image_url": "https://cdn.dico.vn/products/xxx.jpg",
    "custom_fields": {
      "shelf_location": "Kệ A3",
      "price": "35000"
    }
  }
}

Response 404:
{
  "found": false,
  "message": "Sản phẩm không có trong hệ thống"
}
```

### 7.2 Import Excel API

```http
POST /api/b2b/v1/products/import
Headers:
  X-Tenant-ID: {tenant_id}
  Authorization: Bearer {tenant_admin_token}
  Content-Type: multipart/form-data

Body:
  file: [Excel/CSV file]
  column_mapping: {
    "barcode": "Mã vạch",
    "name": "Tên sản phẩm",
    "ingredients": "Thành phần",
    "description": "Mô tả"
  }

Response 202 (Accepted):
{
  "job_id": "uuid",
  "status": "processing",
  "estimated_time": "30s"
}
```

---

## 8. Roadmap Triển khai

### Phase 1 — MVP (Model 1, Cloud)
- [ ] Schema multi-tenant (bảng `tenant`, `b2b_products`)
- [ ] CRUD API sản phẩm B2B
- [ ] Import Excel/CSV (background job)
- [ ] Scan resolution API (priority: tenant → global)
- [ ] Admin Portal cơ bản (web)
- [ ] Phân quyền TENANT_ADMIN / TENANT_EDITOR

### Phase 2 — Production Ready
- [ ] Analytics dashboard
- [ ] Offline cache cho mobile app
- [ ] Audit log
- [ ] Branding tùy chỉnh theo tenant (logo, màu sắc)
- [ ] Webhook notify khi import hoàn tất

### Phase 3 — On-Premise (Model 2)
- [ ] Docker Compose / K8s chart để deploy on-premise
- [ ] License management (key validation, expiry)
- [ ] Admin installer wizard
- [ ] Data migration tool (cloud → on-premise)

---

## 9. Danh sách bảng DB mới cần tạo

| Bảng | Mô tả |
|------|-------|
| `tenants` | Thông tin doanh nghiệp B2B |
| `tenant_users` | User thuộc tenant, role |
| `b2b_products` | Catalog sản phẩm riêng của từng tenant |
| `b2b_import_jobs` | Tracking trạng thái import hàng loạt |
| `b2b_import_errors` | Chi tiết lỗi từng dòng khi import |
| `b2b_scan_logs` | Log lượt quét theo tenant |
| `tenant_subscriptions` | Gói dịch vụ và trạng thái (cloud) |
| `tenant_licenses` | License key (on-premise) |

---

## 10. So sánh 2 mô hình — Bảng tóm tắt

| Tiêu chí | SaaS / Cloud | On-Premise |
|----------|-------------|------------|
| **Đầu tư ban đầu** | Thấp | Cao |
| **Chi phí vận hành** | Subscription tháng | Bảo trì hàng năm |
| **Tích hợp** | API → Plug & Play | Tùy chỉnh theo công ty |
| **Tốc độ triển khai** | 1–3 ngày | 1–4 tuần |
| **Data locality** | Cloud | Nội bộ doanh nghiệp |
| **Offline hoàn toàn** | ❌ (cần internet) | ✅ |
| **Cập nhật phần mềm** | Tự động | Thủ công theo lịch |
| **Phù hợp** | SME, startup | Enterprise, y tế, ngân hàng |

---

## 11. Báo cáo Chi phí & Mô hình Định giá (Pricing & Cost Analysis)

Báo cáo này cung cấp khung chi phí chi tiết, chuẩn xác về mặt kinh tế học cho cả hai mô hình triển khai. Nó giúp doanh nghiệp lập ngân sách và đánh giá ROI (Tỷ suất hoàn vốn).

### 11.1 Mô hình 1 — Cloud / SaaS (Thiên về OPEX - Chi phí hoạt động)

Mô hình SaaS loại bỏ hoàn toàn chi phí đầu tư hạ tầng ban đầu (Zero CAPEX), doanh nghiệp chỉ trả phí thuê bao hàng tháng (Pay-as-you-go).

#### A. Các gói thuê bao (Khuyến nghị)

| Hạng mục | Gói Cơ bản (Basic) | Gói Tiêu chuẩn (Standard) | Gói Doanh nghiệp (Enterprise) |
|---|---|---|---|
| **Giá dự kiến** | **$49 / tháng** | **$199 / tháng** | **Từ $499 / tháng** |
| **Giới hạn Catalog** | 500 sản phẩm | 5.000 sản phẩm | Không giới hạn |
| **Quota lượt quét** | 10.000 lượt / tháng | 100.000 lượt / tháng | Không giới hạn |
| **Phí vượt Quota** | $0.005 / lượt quét | $0.003 / lượt quét | Miễn phí |
| **Hỗ trợ** | Email (SLA 48h) | Ticket & Live Chat (SLA 8h) | Account Manager riêng (SLA 2h) |
| **Import / Export** | Import Excel cơ bản | API Integration + Excel | Real-time ERP Sync |

#### B. Phân tích cấu trúc chi phí (Dịch vụ cung cấp)
*   **Phí khởi tạo (Setup Fee):** $0.
*   **OPEX (Hàng tháng/năm):** Phí thuê bao gói tương ứng.
*   **Ưu điểm Kinh tế:** Dòng tiền linh hoạt, chi phí có thể hạch toán ngay vào chi phí hoạt động trong kỳ, không chịu rủi ro hao mòn công nghệ.

---

### 11.2 Mô hình 2 — On-Premise (Thiên về CAPEX - Chi phí vốn)

Mô hình này đòi hỏi chi phí đầu tư ban đầu lớn để mua giấy phép phần mềm và thiết lập hạ tầng nội bộ, nhưng OPEX hàng năm thường thấp hơn so với SaaS nếu sử dụng quy mô lớn kéo dài.

#### A. Cấu trúc cấu thành chi phí

| Khoản mục chi phí | Loại chi phí | Ước tính mức giá (Tham khảo) | Ghi chú |
|---|---|---|---|
| **1. License Phần mềm (B2B Core System)** | Khởi tạo (CAPEX) | $15,000 - $30,000 | Phí bản quyền vĩnh viễn (One-off) cho 1 cụm server (Cluster). |
| **2. Phí Triển khai & Cài đặt (Deployment)** | Khởi tạo (CAPEX) | $3,000 - $5,000 | Kỹ sư DICO setup tận nơi, cấu hình network, bảo mật, load testing. |
| **3. Hạ tầng Server / VM (Hardware)** | Khởi tạo (CAPEX) | Do Khách hàng tự trang bị | Yêu cầu tối thiểu: 32GB RAM, 8 Cores, 2TB SSD (Database + App Server). |
| **4. Tùy chỉnh & Tích hợp ERP** | Khởi tạo (CAPEX) | Theo báo giá giờ công (man-hour) | Tích hợp hệ thống SAP/Oracle nội bộ của khách hàng để đồng bộ sản phẩm auto. |
| **5. Phí Bảo trì thường niên (Annual Maintenance - AMC)** | Vận hành (OPEX) | 15% - 20% giá License / năm | (*Khoảng $2,250 - $6,000/năm*). Bao gồm: Cập nhật patch bảo mật, fix bug, hỗ trợ kỹ thuật Tier 3. |

#### B. Điểm hòa vốn (Break-even Point) & Phân tích ROI
*   **Thời gian hòa vốn ước tính:** Thông thường, chi phí tổng (TCO - Total Cost of Ownership) của mô hình On-Premise sẽ rẻ hơn SaaS sau **khoảng 3 đến 4 năm** (Giả định doanh nghiệp có lượng sản phẩm > 50,000 và lượng quét > 1,000,000 lượt/tháng).
*   **Ưu điểm Kinh tế:** Tái sử dụng được hạ tầng server nhàn rỗi hiện có. Khấu hao tài sản mềm (Software License) theo thời gian.

---

### 11.3 Báo cáo Tóm tắt Khuyến nghị Tài chính

1. **Khởi nghiệp / Doanh nghiệp Bán lẻ Vừa & Nhỏ (SME):**
   *   **Quyết định Tài chính:** Chọn **Cloud / SaaS**.
   *   **Lý do:** Giữ lại vốn lưu động (Working Capital) để tập trung kinh doanh. Chấp nhận chi phí biến đổi (Variable Cost) tăng theo đà tăng trưởng của doanh thu.

2. **Tập đoàn, Sản xuất quy mô lớn, Thiết bị Y tế (Enterprise):**
   *   **Quyết định Tài chính:** Chọn **On-Premise**.
   *   **Lý do:** Khi Volume quét vượt quá 5 triệu lượt/tháng, phí trả theo lượt của SaaS sẽ cực kỳ khổng lồ. Việc chuyển sang On-Premise giúp đưa khoản phí này về mức cố định (Fixed Cost = Khấu hao License + AMC), tận dụng tối đa lợi ích Kinh tế theo quy mô (Economies of Scale). Đồng thời triệt tiêu rủi ro an toàn thông tin (Data Breach Penalty Risks).

---

## 12. Phân tích Chi phí Nội bộ (DICO Internal COGS & OPEX)

Phần này phân tích chi tiết các khoản chi phí mà **chính DICO phải gánh chịu** để vận hành và duy trì 2 mô hình kinh doanh trên, giúp nội bộ DICO tính toán biên lợi nhuận (Profit Margin).

### 12.1 Chi phí cho Mô hình 1 — Cloud / SaaS

Để phục vụ hàng trăm Doanh nghiệp (Tenants) trên Cloud, DICO cần duy trì một hạ tầng Multi-tenant mạnh mẽ. Đây là **OPEX hàng tháng** của DICO:

| Hạng mục Hạ tầng (AWS/GCP) | Thành phần chi tiết | Ước tính Chiết tính (Tham khảo) |
|---|---|---|
| **Máy chủ Ứng dụng (App Server)** | 2-4 VMs (VD: AWS t3.large hoặc c5.xlarge) + Load Balancer | ~$150 - $400 / tháng |
| **Cơ sở Dữ liệu (Database)** | Managed PostgreSQL (VD: RDS Multi-AZ t3.xlarge) | ~$250 - $600 / tháng |
| **Bộ nhớ Đệm (Cache)** | Managed Redis (VD: ElastiCache) cho Scan Resolution tốc độ cao | ~$50 - $150 / tháng |
| **Lưu trữ Ảnh (Storage)** | AWS S3 / Cloudflare R2 + CDN (Tính theo dung lượng & băng thông) | ~$20 - $100 / tháng (tùy scale) |
| **Tổng Hạ tầng (Base Cloud Cost)** | Dành cho giai đoạn đầu (10-50 tenants) | **~$470 - $1,250 / tháng** |

**Chi phí Vận hành (Personnel & Ops):**
- **DevOps/Sysadmin:** Quản lý hạ tầng, backup, monitor uptime 99.9%.
- **Customer Success Manager (CSM) / Support:** Giải đáp thắc mắc, xử lý ticket lỗi từ các B2B tenants.
- *Nhận xét:* Biên lợi nhuận (Gross Margin) của mô hình SaaS rât cao (thường > 80%) sau khi đã trang trải xong chi phí Base Cloud Cost cố định. Chi phí tăng thêm (Marginal Cost) cho 1 tenant mới là gần bằng $0.

### 12.2 Chi phí cho Mô hình 2 — On-Premise

Ở mô hình này, khách hàng tự chịu tiền Server/Hạ tầng. Chi phí của DICO chủ yếu tập trung vào **Nhân sự Kỹ thuật (Man-hour)**.

| Khoản mục Chi phí Nội bộ | Mô tả chi tiết | Tính chất |
|---|---|---|
| **Đóng gói Phần mềm (R&D Cost)** | Chi phí Dev để tạo ra bản cài đặt chuẩn (Docker images, Kubernetes Helm charts, Installer scripts) tách biệt khỏi Cloud. | CAPEX 1 lần. Khấu hao theo thời gian. |
| **Chi phí Triển khai (Deployment)** | Lương trả cho Kỹ sư Hệ thống / Solutions Architect đến setup tại server của khách (hoặc remote qua VPN). Tốn từ 2-5 ngày công/khách. | Trực tiếp trừ vào Doanh thu Phí Triển khai (Setup Fee). |
| **Chi phí Customization (Tùy chỉnh)** | Dev/BA ngồi lại với khách hàng để code riệng các API đồng bộ ERP (SAP, Oracle). | Tính giá theo Man-month/Man-hour để đảm bảo có lời. |
| **Chi phí Bảo trì (OPEX)** | Source code phải duy trì nhiều version khác nhau (Version phân mảnh). Kỹ sư phải support khi server khách hàng bị lỗi rớt mạng, lỗi OS. | Dùng Phí Bảo Trì thường niên (AMC 15-20%) để bù đắp quỹ lương Kỹ sư Support. |

### 12.3 Tổng kết Biên Lợi Nhuận (Margins) cho DICO

1. **Với Cloud SaaS:** 
   - Rủi ro: DICO phải ứng trước chi phí Server hàng tháng dù có ít hay nhiều khách.
   - Trọng điểm: Tối ưu Database Indexing và Catching để 1 mảng Server gánh được nhiều Tenants nhất có thể. Biên lợi nhuận cực kỳ cao khi Scale-up.
2. **Với On-Premise:** 
   - Rủi ro: Chi phí Server DICO = $0. Nhưng DICO rủi ro bị "mắc kẹt" nhân sự vào việc support lỗi vặt hạ tầng của khách hàng.
   - Trọng điểm: Phải xây dựng tài liệu cài đặt cực kỳ chuẩn mực và làm rõ **Ranh giới Support** trong hợp đồng (DICO chỉ fix bug code, không đi sửa lỗi cáp mạng hay ổ cứng của khách hàng).