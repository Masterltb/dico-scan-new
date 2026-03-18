# DICO Scan - Tổng quan Hệ thống Dự án V2 (Cập nhật)

## 1. Mục đích Tài liệu
Bộ tài liệu V2 ("Production-Grade") định nghĩa chính xác toàn bộ logic của hệ thống **DICO Scan**. Không chấp nhận diễn giải mơ hồ. Đội ngũ kỹ sư và AI Agent bắt buộc tuân theo scoring deterministic trước khi áp dụng AI.

## 2. Các lớp của hệ thống
1. **Lớp Authentication & Tier Gating:**
   - JWT token (HS256) cho xác thực. BCrypt cho password.
   - FREE users: scan cơ bản, không personalization.
   - PREMIUM users: safety profile, personal allergy alerts, category-specific AI analysis.
2. **Lớp Deterministic Scoring Engine (Ưu tiên Cao nhất):**
   - Đánh giá sản phẩm thông qua công thức toán học XANH/VÀNG/ĐỎ.
   - Hỗ trợ **đa danh mục**: FOOD, TOY, BEAUTY, FASHION, GENERAL.
   - Override rules: Blacklist additives, Allergy conflict, Missing data.
3. **Lớp AI Explanation:**
   - Gemini 2.5 Flash sinh tóm tắt < 50 từ.
   - Category-specific prompt templates.
   - AI **không** override thẻ màu của Scoring Engine.
4. **Lớp Recommendation (Phase 2+):**
   - Gợi ý sản phẩm thay thế. Chưa thuộc phạm vi hiện tại.

## 3. Technology Stack
- **Backend:** Spring Boot 3.x (Java 21). Google Cloud Run (Serverless).
- **Database:** PostgreSQL 16 (Cloud SQL). Flyway DB Migration (V1-V4).
- **Frontend/Mobile:** React Native (iOS & Android).
- **AI Model:** Gemini 1.5 Flash, gọi trực tiếp từ backend.
- **Data Source:** OpenFoodFacts API V2.
- **Security:** JWT (HS256), BCrypt, X-User-Id header.

## 4. Danh mục File V2 (File Map)
### Tài liệu Backend Core (9 files)
- `01_PRODUCT_REQUIREMENTS_V2.md` — Yêu cầu dự án, User Stories, AC.
- `02_SYSTEM_ARCHITECTURE_V2.md` — Kiến trúc hệ thống, orchestrator flow.
- `03_DETERMINISTIC_SCORING_ENGINE_V2.md` — Công thức, ngưỡng, overrides.
- `04_AI_INTEGRATION_CONTRACT_V2.md` — LLM specs, prompt template, timeout.
- `05_DATA_DICTIONARY_ERD_V2.md` — ERD, constraints, indexes (3 bảng, V1-V4 migrations).
- `06_API_SPECIFICATION_V2.yaml` — OpenAPI Spec (7 endpoints).
- `07_EXTERNAL_INTEGRATION_OFF_V2.md` — OFF API resilience, payload extraction.
- `08_IMPLEMENTATION_ROADMAP_V2.md` — Sprint checklist (Sprint 1-3 ✅, Sprint 4 🔲).
- `09_TECHNICAL_GUARDRAILS_V2.md` — Non-negotiable coding rules.

### Tài liệu Mobile (5 files)
- `10_MOBILE_PRODUCT_SPEC.md` — Mobile product specifications.
- `11_MOBILE_ARCHITECTURE_V2.md` — Mobile architecture.
- `12_MOBILE_API_CONTRACT.md` — Mobile API contract.
- `13_MOBILE_COMPONENT_SPEC.md` — Mobile component specifications.
- `14_MOBILE_IMPLEMENTATION_ROADMAP.md` — Mobile implementation roadmap.

### Context & Memory
- `memory.md` — AI Agent compressed context guide.
