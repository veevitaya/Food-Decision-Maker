WITH base_views AS (
  SELECT
    v.id AS view_event_id,
    v.user_id,
    v.session_id,
    v.created_at,
    COALESCE(
      v.item_id,
      CASE WHEN (v.metadata ->> 'restaurantId') ~ '^[0-9]+$' THEN (v.metadata ->> 'restaurantId')::int END,
      CASE WHEN (v.metadata ->> 'itemId') ~ '^[0-9]+$' THEN (v.metadata ->> 'itemId')::int END
    ) AS item_id,
    CASE
      WHEN COALESCE(v.metadata ->> 'lat', v.metadata ->> 'userLat', v.metadata ->> 'user_lat') ~ '^-?[0-9]+(\.[0-9]+)?$'
      THEN COALESCE(v.metadata ->> 'lat', v.metadata ->> 'userLat', v.metadata ->> 'user_lat')::double precision
      ELSE NULL
    END AS user_lat,
    CASE
      WHEN COALESCE(v.metadata ->> 'lng', v.metadata ->> 'userLng', v.metadata ->> 'user_lng') ~ '^-?[0-9]+(\.[0-9]+)?$'
      THEN COALESCE(v.metadata ->> 'lng', v.metadata ->> 'userLng', v.metadata ->> 'user_lng')::double precision
      ELSE NULL
    END AS user_lng
  FROM event_logs v
  WHERE v.event_type IN ('view_card', 'view_detail')
    AND v.user_id IS NOT NULL
    AND v.created_at >= NOW() - INTERVAL '180 days'
),
joined AS (
  SELECT
    b.view_event_id,
    b.user_id,
    b.session_id,
    b.created_at,
    CONCAT(
      b.user_id,
      ':',
      COALESCE(b.session_id, 'no-session'),
      ':',
      TO_CHAR(DATE_TRUNC('minute', b.created_at), 'YYYYMMDDHH24MI')
    ) AS group_key,
    b.item_id,
    b.user_lat,
    b.user_lng,
    r.category,
    r.price_level,
    CASE WHEN r.lat ~ '^-?[0-9]+(\.[0-9]+)?$' THEN r.lat::double precision ELSE NULL END AS r_lat,
    CASE WHEN r.lng ~ '^-?[0-9]+(\.[0-9]+)?$' THEN r.lng::double precision ELSE NULL END AS r_lng,
    COALESCE(r.trending_score, 0)::double precision AS trending_score,
    ufs.cuisine_affinity,
    COALESCE(ufs.preferred_price_level, 2) AS preferred_price_level,
    COALESCE(ufs.active_hours, ARRAY[]::int[]) AS active_hours,
    COALESCE(ufs.disliked_item_ids, ARRAY[]::int[]) AS disliked_item_ids,
    COALESCE(ifs.ctr, 0) AS item_ctr
  FROM base_views b
  JOIN restaurants r ON r.id = b.item_id
  LEFT JOIN user_feature_snapshots ufs ON ufs.user_id = b.user_id
  LEFT JOIN item_feature_snapshots ifs ON ifs.item_id = b.item_id
  WHERE b.item_id IS NOT NULL
),
features AS (
  SELECT
    j.view_event_id,
    j.group_key,
    j.user_id,
    j.item_id,
    j.created_at,
    COALESCE(
      (j.cuisine_affinity ->> j.category)::double precision,
      (j.cuisine_affinity ->> lower(j.category))::double precision,
      0
    ) AS cuisine_affinity,
    GREATEST(0, 1 - ABS(COALESCE(j.price_level, 2) - j.preferred_price_level) / 3.0) AS price_match,
    CASE
      WHEN j.user_lat IS NOT NULL AND j.user_lng IS NOT NULL AND j.r_lat IS NOT NULL AND j.r_lng IS NOT NULL THEN
        GREATEST(
          0,
          1 - LEAST(
            (
              6371000.0 * 2 * ASIN(
                SQRT(
                  POWER(SIN(RADIANS((j.r_lat - j.user_lat) / 2.0)), 2) +
                  COS(RADIANS(j.user_lat)) * COS(RADIANS(j.r_lat)) *
                  POWER(SIN(RADIANS((j.r_lng - j.user_lng) / 2.0)), 2)
                )
              )
            ) / 10000.0,
            1
          )
        )
      ELSE 0.5
    END AS distance_score,
    LEAST(1, GREATEST(0, j.trending_score / 100.0)) AS popularity_score,
    CASE WHEN j.item_id = ANY(j.disliked_item_ids) THEN 1 ELSE 0 END AS disliked,
    CASE WHEN EXTRACT(HOUR FROM j.created_at)::int = ANY(j.active_hours) THEN 1 ELSE 0 END AS hour_active,
    CASE WHEN EXTRACT(DOW FROM j.created_at)::int IN (0, 6) THEN 1 ELSE 0 END AS is_weekend,
    CASE WHEN j.item_ctr < 10 THEN 1 ELSE 0 END AS new_restaurant
  FROM joined j
),
labeled AS (
  SELECT
    f.*,
    CASE
      WHEN EXISTS (
        SELECT 1
        FROM event_logs p
        WHERE p.user_id = f.user_id
          AND p.created_at >= f.created_at
          AND p.created_at <= f.created_at + INTERVAL '24 hours'
          AND COALESCE(
            p.item_id,
            CASE WHEN (p.metadata ->> 'restaurantId') ~ '^[0-9]+$' THEN (p.metadata ->> 'restaurantId')::int END,
            CASE WHEN (p.metadata ->> 'itemId') ~ '^[0-9]+$' THEN (p.metadata ->> 'itemId')::int END
          ) = f.item_id
          AND p.event_type IN (
            'swipe_right',
            'swipe_super',
            'click_menu_item',
            'open_partner_link',
            'deeplink_click',
            'order_intent'
          )
      ) THEN 1 ELSE 0
    END AS label
  FROM features f
)
SELECT
  view_event_id,
  group_key,
  user_id,
  item_id,
  created_at,
  cuisine_affinity,
  price_match,
  distance_score,
  popularity_score,
  disliked,
  hour_active,
  is_weekend,
  new_restaurant,
  label
FROM labeled
ORDER BY created_at ASC;
