-- PMO email (GAF/pet approvals) is configured per development, not per property.

UPDATE developments d
SET
  settings = COALESCE(d.settings, '{}'::jsonb) || jsonb_build_object(
    'pmoEmail',
    COALESCE(
      NULLIF(TRIM(d.settings->>'pmoEmail'), ''),
      (
        SELECT NULLIF(TRIM(a.email_to), '')
        FROM properties p
        JOIN app_settings a ON a.property_id = p.id
        WHERE p.residence_name = d.name
        ORDER BY p.created_at ASC NULLS LAST
        LIMIT 1
      ),
      'stlmonaco.theresortresidences@azurenorth.com.ph'
    )
  ),
  updated_at = now()
WHERE slug = 'azure-north-residences';
