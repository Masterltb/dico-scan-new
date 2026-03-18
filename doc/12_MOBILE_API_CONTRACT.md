# 12 – Mobile API Contract

Tài liệu này định nghĩa **chính xác** các kiểu TypeScript, các endpoint, và quy ước mà Mobile App phải tuân theo khi giao tiếp với Backend (`Spring Boot /v1/...`).

> [!IMPORTANT]
> Đây là nguồn sự thật duy nhất (Single Source of Truth) cho API Layer. Bất kỳ thay đổi nào về backend endpoint hoặc DTO **phải** được cập nhật vào đây trước.

---

## 1. TypeScript Types (mirrors Backend DTOs)

```typescript
// src/api/types.ts

export type RatingColor = "GREEN" | "YELLOW" | "RED" | "UNKNOWN";

/** Mirrors: ProductEvaluationResponse.java */
export interface ProductEvaluationResponse {
  barcode: string;
  name: string | null;
  brand: string | null;
  imageUrl: string | null;
  rating: RatingColor;
  score: number | null;        // 0-100, null khi rating = UNKNOWN
  confidenceScore: number;     // 0.0-1.0
  aiSummary: string | null;    // null nếu Gemini timeout/error
  overrideReasons: string[] | null; // null nếu không có override
  cachedAt: string;            // ISO 8601 UTC
}

/** Mirrors: ScanHistoryItemResponse.java */
export interface ScanHistoryItem {
  barcode: string;
  name: string | null;
  scannedAt: string;           // ISO 8601 UTC
  snapshotColor: RatingColor;
}

/** User Subscription & Status Info */
export interface UserSubscriptionStatus {
  tier: "FREE" | "PREMIUM" | "PREMIUM_GOLD";
  availableTokens: number;     // Số xu hiện có (Dành cho FREE)
  premiumExpiryDate?: string;  // Ngày hết hạn Premium nếu có (ISO 8601 UTC)
}

/** Mirrors: ProfileRequest/Response (Premium Gold Only) */
export interface FamilyProfile {
  id: string;                  // UUID
  name: string;                // Tên người thân
  relationship: "CHILD" | "SPOUSE" | "PARENT" | "OTHER";
  allergies: string[];
  diet: string;
}

export type CreateFamilyProfileRequest = Omit<FamilyProfile, 'id'>;

/** Mirrors: StandardError.java */
export interface StandardError {
  errorCode: string;
  message: string;
  traceId: string;
}

/** Mirrors: UpdatePreferencesRequest.java (Chứa cả Cấu hình dị ứng sâu) */
export interface UpdateSafetyProfileRequest {
  allergies: string[];         // Tối đa 5 items
  diet: string;                // "NONE" | "VEGETARIAN" | "VEGAN" | "LOW_SUGAR" | "LOW_SALT"
  customAllergies?: string[];  // Thêm custom items nếu user ghi chú thêm
}

/** Loved/Saved Product (Premium) */
export interface FavoriteProduct {
  barcode: string;
  name: string;
  savedAt: string;
  imageUrl?: string;
}

/** Preferred Allergen tags */
export const ALLERGEN_OPTIONS = [
  "gluten", "peanut", "shellfish", "milk",
  "egg", "soy", "tree_nut", "fish"
] as const;

export type AllergenKey = typeof ALLERGEN_OPTIONS[number];
```

---

## 2. API Endpoints

### 2.1 Mảng User & Authentication (`/v1/auth`, `/v1/users`)

#### 2.1.1 GET /v1/users/me/subscription
| Item | Value |
|---|---|
| Method | GET |
| Path | `/v1/users/me/subscription` |
| Headers | `X-User-Id: <uuid>` |
| Success | `200 OK` → `UserSubscriptionStatus` |
| Note | Gọi lại API này ngay sau khi User xem xong quảng cáo để sync số liệu Token mới. |

#### 2.1.2 POST /v1/users/me/tokens/reward
| Item | Value |
|---|---|
| Method | POST |
| Path | `/v1/users/me/tokens/reward` |
| Headers | `X-User-Id: <uuid>` |
| Success | `200 OK` → `{ tokens: number }` |
| Note | Mobile gọi API này khi nhận Callback Success từ SDK Quảng cáo (Rewarded Video). Backend sẽ có cơ chế verify sau với AdMob S2S (Phase 2). |

---

### 2.2 Mảng Core: Sản phẩm & Lịch sử (`/v1/products`, `/v1/users/me/history`)

#### 2.2.1 GET /v1/products/{barcode}

| Item | Value |
|---|---|
| Method | GET |
| Path | `/v1/products/{barcode}` |
| Query Params | `allergies=peanut` (Free), `profileId=<uuid>` (Premium Gold), `useToken=true` (Free mua Premium-lite) |
| Headers | `X-User-Id: <uuid>` |
| Success | `200 OK` → `ProductEvaluationResponse` |
| Error Codes | `404` (San pham khong ton tai) / `402` (Not_Enough_Tokens - Không đủ xu để mua Premium-lite) / `403` (Premium_Required - Lỗi cố gọi truyền ProfileId khi không có Gold) |

**TypeScript Client Usage:**
```typescript
// src/api/products.ts
export interface GetProductParams {
  allergies?: string[];
  profileId?: string; // Dành cho Premium Gold
  useToken?: boolean; // Dành cho Free user muốn mở khóa
}

export const getProduct = async (
  barcode: string,
  options?: GetProductParams
): Promise<ProductEvaluationResponse> => {
  const params: Record<string, any> = {};
  if (options?.allergies?.length) params.allergies = options.allergies.join(",");
  if (options?.profileId) params.profileId = options.profileId;
  if (options?.useToken) params.useToken = options.useToken;

  const { data } = await apiClient.get<ProductEvaluationResponse>(
    `/v1/products/${barcode}`, { params }
  );
  return data;
};
```

#### 2.2.2 GET /v1/users/me/history
| Item | Value |
|---|---|
| Method | GET |
| Path | `/v1/users/me/history` |
| Query Params | `page=0&size=20` |
| Headers | `X-User-Id: <uuid>` |
| Success | `200 OK` → `ScanHistoryItem[]` |

---

### 2.3 Mảng Safety Profile & Preferences (Premium Only)

#### 2.3.1 GET, PUT /v1/users/me/safety-profile
| Item | Value |
|---|---|
| Method | GET / PUT |
| Path | `/v1/users/me/safety-profile` |
| Body (PUT) | `UpdateSafetyProfileRequest` |
| Headers | `X-User-Id: <uuid>` |
| Success | `200 OK` |
| Status | Chỉ khả dụng cho `PREMIUM` / `PREMIUM_GOLD`. Nếu `FREE` gửi lên trả `403`. |

#### 2.3.2 CRUD /v1/users/me/family-profiles
| Item | Value |
|---|---|
| Method | GET, POST, PUT, DELETE |
| Path | `/v1/users/me/family-profiles` |
| Body (POST) | `CreateFamilyProfileRequest` |
| Status | Chỉ khả dụng cho `PREMIUM_GOLD`. Trả `403` nếu khác tier. |
| Success | `200 OK` → `FamilyProfile[]` (GET), `FamilyProfile` (POST/PUT) |

---

### 2.4 Mảng Favorites / Bookmark (Premium Only)

#### 2.4.1 Cấu trúc API Favorites
| Method | Path | Description | Result |
|---|---|---|---|
| GET | `/v1/favorites` | Lấy Ds sản phẩm đã lưu | `200 OK` → `FavoriteProduct[]` |
| POST | `/v1/favorites/{barcode}` | Bookmark sản phẩm | `200 OK` |
| DELETE| `/v1/favorites/{barcode}` | Xóa khỏi Bookmark | `204 No Content` |

> *Free users sẽ nhận HTTP `403` nếu cố lưu sản phẩm.*

---

### 2.5 Mảng Upload & Đóng góp (Chung cho tất cả)

#### 2.5.1 POST /v1/contribute
| Item | Value |
|---|---|
| Method | POST |
| Path | `/v1/contribute` |
| Content-Type | `multipart/form-data` |
| Form Fields | `barcode: string`, `image: File` |
| Success | `202 Accepted` → `{ status: "ACCEPTED", message: string, barcode: string }` |

**TypeScript usage:**
```typescript
export const submitContribution = async (barcode: string, imageUri: string) => {
  const formData = new FormData();
  formData.append("barcode", barcode);
  formData.append("image", { uri: imageUri, name: "product.jpg", type: "image/jpeg" } as any);
  await apiClient.post("/v1/contribute", formData, { headers: { "Content-Type": "multipart/form-data" } });
};
```

---

## 3. Axios Client Configuration
```typescript
// src/api/client.ts
import axios from "axios";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8080";
const TIMEOUT_MS = parseInt(process.env.EXPO_PUBLIC_API_TIMEOUT_MS ?? "5000");

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUT_MS,
  headers: { "Content-Type": "application/json", "Accept": "application/json" }
});

// Interceptor: Lấy Token/User-Id từ Cache
apiClient.interceptors.request.use(async (config) => {
  const userId = await AsyncStorage.getItem("userId"); // Chuyển sang Bearer Token ở Phase 2
  if (userId) config.headers["X-User-Id"] = userId;
  return config;
});

// Interceptor: Chuẩn hóa Error
apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    const standardError: StandardError = error.response?.data ?? {
      errorCode: "NETWORK_ERROR",
      message: "Không thể kết nối tới server",
      traceId: "unknown",
    };
    return Promise.reject(standardError);
  }
);
```

---

## 4. TanStack Query Keys & Error Handling Conventions

**Query Keys (tránh Cache Collision):**
```typescript
export const queryKeys = {
  product: (barcode: string, options?: GetProductParams) => ["product", barcode, JSON.stringify(options)] as const,
  history: (page: number) => ["history", page] as const,
  profile: () => ["safety-profile"] as const,
  subscription: () => ["user-subscription"] as const,
} as const;
```

**Common Error Codes:**
| HTTP Status | Internal `errorCode` | Mobile UI (Frontend Action) |
|---|---|---|
| `200` | N/A | Render Dữ liệu. |
| `400` | `INVALID_INPUT` | Hiển thị Validation Error inline. |
| `402` | `NOT_ENOUGH_TOKENS` | Hiển thị popup: *"Bạn không đủ Xu, xem thêm Quảng cáo rinh thêm Xu nhé!"* |
| `403` | `PREMIUM_REQUIRED` | Bắn sang luồng Paywall/Up-sell: (Mua Premium/Gold Screen). |
| `404` | `PRODUCT_NOT_FOUND`| Cho phép người dùng Upload ảnh đóng góp qua ContributeScreen. |
| `503` | `SERVICE_UNAVAILABLE`| Hiển thị Error Banner toàn màn hình với nút "Thử lại". |
| Network | Timeout/Mất mạng | Hiện toast "Chưa có kết nối mạng" -> Cố gắng tải dữ liệu từ Local SQLite Cache (với Premium). |
