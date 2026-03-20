CREATE TABLE IF NOT EXISTS product_affiliate_links (
    barcode         VARCHAR(14) PRIMARY KEY,
    shopee_item_id  VARCHAR(50),
    shopee_shop_id  VARCHAR(50),
    affiliate_url   TEXT NOT NULL,
    platform        VARCHAR(20) NOT NULL DEFAULT 'SHOPEE',
    fetched_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days')
);

CREATE INDEX idx_affiliate_barcode ON product_affiliate_links(barcode);
CREATE INDEX idx_affiliate_expires ON product_affiliate_links(expires_at);
