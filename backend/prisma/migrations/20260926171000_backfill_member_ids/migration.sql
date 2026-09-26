WITH numbered AS (
  SELECT id,
         ROW_NUMBER() OVER (ORDER BY "createdAt", id) AS sequence
  FROM "User"
  WHERE "memberId" IS NULL
)
UPDATE "User" AS u
SET "memberId" = 'IN-' || LPAD(numbered.sequence::TEXT, 10, '0')
FROM numbered
WHERE u.id = numbered.id;
