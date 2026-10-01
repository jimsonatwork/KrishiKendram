-- Enforce the core ownership invariant at the database boundary.
-- Only one active OWNER relationship may exist for a resource at a time.
-- Historical/terminated relationships remain unrestricted.
CREATE UNIQUE INDEX "ResourceRelationship_active_owner_unique"
ON "ResourceRelationship" ("resourceType", "resourceId")
WHERE "relationshipType" = 'OWNER' AND "endedAt" IS NULL;
