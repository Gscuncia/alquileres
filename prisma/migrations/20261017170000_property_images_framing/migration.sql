-- Convert images from text[] of URLs to jsonb array of {url, fit, position}
ALTER TABLE "properties" ALTER COLUMN "images" TYPE JSONB USING to_jsonb("images");

-- Wrap each legacy URL string into a framing object (defaults: cover, center)
UPDATE "properties"
SET "images" = COALESCE(
  (SELECT jsonb_agg(jsonb_build_object('url', img, 'fit', 'cover', 'position', 'center') ORDER BY ord)
   FROM jsonb_array_elements_text("properties"."images") WITH ORDINALITY AS t(img, ord)),
  '[]'::jsonb
);

-- Match the Prisma schema default (`images Json @default("[]")`).
ALTER TABLE "properties" ALTER COLUMN "images" SET DEFAULT '[]'::jsonb;
