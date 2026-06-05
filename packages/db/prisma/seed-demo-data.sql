-- ───────────────────────────────────────────────────────────────────────────
-- Demo DATA for kabon.africa — populates every admin section so the VIEWER /
-- investor demo feels alive. Idempotent (ON CONFLICT DO NOTHING on stable ids).
-- Run AFTER seed-demo.sql (which creates the login accounts). Safe to re-run.
--
--   docker compose -f docker-compose.prod.yml exec -T postgres \
--     psql -U carbonafrika -d carbonafrika < packages/db/prisma/seed-demo-data.sql
-- ───────────────────────────────────────────────────────────────────────────
BEGIN;

-- ── Methodologies ──────────────────────────────────────────────────────────
INSERT INTO "Methodology" ("code","name","category","scope","summary","bufferPercent","monitoringPeriodMonths","active","createdAt","updatedAt") VALUES
 ('KCS-AR-01','Afforestation & Reforestation','Land Restoration','Tree planting, assisted natural regeneration','Carbon sequestration from establishing new forest cover on degraded land.',20,12,true,now(),now()),
 ('KCS-GR-01','Grassland & Rangeland Restoration','Land Restoration','Rotational grazing, bush-encroachment reversal','Soil organic carbon gains from restoring degraded pastoralist rangelands.',15,12,true,now(),now()),
 ('KCS-CS-01','Improved Cookstoves','Clean Energy','Fuel-efficient cookstove distribution','Emissions avoided by displacing inefficient biomass burning in households.',10,12,true,now(),now()),
 ('KCS-SOLAR-01','Solar Mini-grid','Clean Energy','Off-grid solar generation','Emissions avoided by displacing diesel generation with solar PV.',10,12,true,now(),now())
ON CONFLICT ("code") DO NOTHING;

-- ── Extra users (data only; no login — passwordHash NULL) ───────────────────
INSERT INTO "User" ("id","email","name","role","country","kycVerified","createdAt","updatedAt") VALUES
 ('s_u_wanjiru','wanjiru@demo.kabon.africa','Mama Wanjiru Cooperative','LANDOWNER','Kenya',true,now(),now()),
 ('s_u_meru','meru.energy@demo.kabon.africa','Meru Energy SACCO','LANDOWNER','Kenya',true,now(),now()),
 ('s_u_verifier','verifier@demo.kabon.africa','Dr. Achieng (Verifier)','VERIFIER','Kenya',true,now(),now()),
 ('s_u_partner','partner@demo.kabon.africa','Rift Valley Community Org','COMMUNITY_PARTNER','Kenya',true,now(),now()),
 ('s_u_acme','procurement@acmecorp.demo','Acme Corp (Buyer)','BUYER','United Kingdom',true,now(),now())
ON CONFLICT ("id") DO NOTHING;

-- Give the verifier a land-restoration + clean-energy scope (so scope filtering shows)
UPDATE "User" SET "verifierScopes" = ARRAY['LAND_RESTORATION','CLEAN_ENERGY']::"ProjectType"[] WHERE "id" = 's_u_verifier';

-- ── Buffer pool (singleton) ────────────────────────────────────────────────
INSERT INTO "BufferPool" ("id","totalReserved","totalDrawn","createdAt","updatedAt") VALUES
 ('s_pool','571.5',10,now(),now())
ON CONFLICT ("id") DO NOTHING;

-- ── Projects ───────────────────────────────────────────────────────────────
INSERT INTO "Project" ("id","ownerId","title","description","projectType","landType","energyType","capacityKw","householdsServed","methodologyCode","partnerId","partnerRoyaltyPercent","country","region","lat","lng","hectares","estimatedTons","status","mediaUrls","createdAt","updatedAt") VALUES
 ('s_p_meru', (SELECT id FROM "User" WHERE email='owner@kabon.africa'), 'Meru Community Reforestation','Indigenous tree planting and assisted natural regeneration on degraded slopes near Meru. 260 ha under restoration with 12 community groups.','LAND_RESTORATION','FOREST',NULL,NULL,NULL,'KCS-AR-01','s_u_partner',3,'Kenya','Meru',0.047,37.649,260,2400,'VERIFIED','{}',now(),now()),
 ('s_p_kajiado', 's_u_wanjiru','Kajiado Grassland Restoration','Rotational grazing and bush-encroachment reversal across 420 ha of community rangeland in Kajiado.','LAND_RESTORATION','GRASSLAND',NULL,NULL,NULL,'KCS-GR-01',NULL,0,'Kenya','Kajiado',-1.852,36.787,420,1800,'ACTIVE','{}',now(),now()),
 ('s_p_solar', 's_u_meru','Turkana Solar Mini-grid','A 250 kW solar mini-grid displacing diesel generation for 1,200 households in Turkana.','CLEAN_ENERGY',NULL,'SOLAR_PV',250,1200,'KCS-SOLAR-01',NULL,0,'Kenya','Turkana',3.116,35.597,2,1700,'VERIFIED','{}',now(),now()),
 ('s_p_cook', (SELECT id FROM "User" WHERE email='owner@kabon.africa'),'Nakuru Clean Cookstoves','Distribution of 5,000 fuel-efficient cookstoves across Nakuru county households.','CLEAN_ENERGY',NULL,'COOKSTOVES',NULL,5000,'KCS-CS-01',NULL,0,'Kenya','Nakuru',-0.303,36.080,1,900,'UNDER_REVIEW','{}',now(),now()),
 ('s_p_embu', 's_u_wanjiru','Embu Agroforestry','Smallholder agroforestry integrating fruit and nitrogen-fixing trees on farmland.','LAND_RESTORATION','FARMLAND',NULL,NULL,NULL,'KCS-AR-01',NULL,0,'Kenya','Embu',-0.538,37.457,85,600,'PENDING','{}',now(),now())
ON CONFLICT ("id") DO NOTHING;

-- ── Verifications ──────────────────────────────────────────────────────────
INSERT INTO "Verification" ("id","projectId","verifierId","status","notes","carbonTons","creditsIssued","issuedById","issuedAt","createdAt","updatedAt") VALUES
 ('s_v_meru','s_p_meru','s_u_verifier','APPROVED','Field + satellite assessment complete; NDVI trend positive.',2310,true,(SELECT id FROM "User" WHERE email='admin@kabon.africa'),now(),now(),now()),
 ('s_v_solar','s_p_solar','s_u_verifier','APPROVED','Metered generation validated against displaced diesel baseline.',1500,true,(SELECT id FROM "User" WHERE email='admin@kabon.africa'),now(),now(),now()),
 ('s_v_cook','s_p_cook','s_u_verifier','IN_PROGRESS','Awaiting fuel-use survey data.',NULL,false,NULL,NULL,now(),now())
ON CONFLICT ("id") DO NOTHING;

-- ── Carbon credits ─────────────────────────────────────────────────────────
INSERT INTO "CarbonCredit" ("id","projectId","tokenId","amount","bufferTons","vintageYear","status","mintTxHash","createdAt","updatedAt") VALUES
 ('s_c_meru','s_p_meru','kc-demo-meru-001',1963.5,346.5,2025,'AVAILABLE','0xsim_demo_meru',now(),now()),
 ('s_c_solar','s_p_solar','kc-demo-solar-001',1275,225,2025,'LISTED','0xsim_demo_solar',now(),now())
ON CONFLICT ("id") DO NOTHING;

-- ── Buffer contributions (2 issuance + 1 reversal drawdown) ─────────────────
INSERT INTO "BufferContribution" ("id","poolId","creditId","projectId","tonnes","reason","note","createdAt") VALUES
 ('s_bc_meru','s_pool','s_c_meru','s_p_meru',346.5,'issuance',NULL,now()),
 ('s_bc_solar','s_pool','s_c_solar','s_p_solar',225,'issuance',NULL,now()),
 ('s_bc_rev','s_pool',NULL,'s_p_meru',10,'reversal_backfill','Demo: small reversal backfill after a localized fire event.',now())
ON CONFLICT ("id") DO NOTHING;

-- ── Marketplace listings ───────────────────────────────────────────────────
INSERT INTO "Listing" ("id","creditId","pricePerTon","totalTons","currency","status","isResale","createdAt","updatedAt") VALUES
 ('s_l_meru','s_c_meru',14,1000,'USDC','ACTIVE',false,now(),now()),
 ('s_l_solar','s_c_solar',11,1075,'USDC','ACTIVE',false,now(),now())
ON CONFLICT ("id") DO NOTHING;

-- ── Purchases (1 settled+held, 1 retired) ──────────────────────────────────
INSERT INTO "Purchase" ("id","listingId","buyerId","totalTons","totalPrice","feeAmount","buyerTotal","currency","settlementStatus","deliveredAt","releasedAt","retired","retiredAt","retirementReason","createdAt","updatedAt") VALUES
 ('s_pu_1','s_l_solar',(SELECT id FROM "User" WHERE email='buyer@kabon.africa'),200,2200,44,2244,'USDC','RELEASED',now(),now(),false,NULL,NULL,now(),now()),
 ('s_pu_2','s_l_meru','s_u_acme',150,2100,42,2142,'USDC','RELEASED',now(),now(),true,now(),'2025 corporate net-zero commitment',now(),now())
ON CONFLICT ("id") DO NOTHING;

-- ── Resale request (buyer wants to resell, awaiting admin) ──────────────────
INSERT INTO "ResaleRequest" ("id","purchaseId","buyerId","tons","proposedPricePerTon","currency","status","buyerNote","createdAt","updatedAt") VALUES
 ('s_rr_1','s_pu_1',(SELECT id FROM "User" WHERE email='buyer@kabon.africa'),200,16,'USDC','REQUESTED','Holding gained value; would like to resell at market.',now(),now())
ON CONFLICT ("id") DO NOTHING;

-- ── Buyer inquiries ────────────────────────────────────────────────────────
INSERT INTO "BuyerInquiry" ("id","companyName","contactName","email","country","estimatedAnnualTons","useCase","message","status","createdAt","updatedAt") VALUES
 ('s_bi_1','Northwind Logistics','Sarah Mwangi','sarah@northwind.demo','Kenya',5000,'Annual ESG / sustainability report','We ship across East Africa and want verified local offsets.','PENDING',now(),now()),
 ('s_bi_2','GreenLeaf Foods','Tom Becker','tom@greenleaf.demo','Germany',12000,'Product carbon-neutral claim','Looking for African nature-based credits for our product line.','APPROVED',now(),now()),
 ('s_bi_3','QuickShip','Ana Lopez','ana@quickship.demo','Spain',800,'Event offset','Small volume for a corporate event.','REJECTED',now(),now())
ON CONFLICT ("id") DO NOTHING;

-- ── Community partner application (approved) ─────────────────────────────────
INSERT INTO "PartnerApplication" ("id","fullName","email","country","region","organization","yearsExperience","communitiesServed","status","reviewedById","reviewedAt","createdUserId","createdAt","updatedAt") VALUES
 ('s_pa_1','Joseph Kiplagat','partner@demo.kabon.africa','Kenya','Rift Valley','Rift Valley Community Org',8,'Pastoralist communities across Kajiado, Narok and Turkana','APPROVED',(SELECT id FROM "User" WHERE email='admin@kabon.africa'),now(),'s_u_partner',now(),now())
ON CONFLICT ("id") DO NOTHING;

-- ── Partner earnings ledger ─────────────────────────────────────────────────
INSERT INTO "PartnerEarning" ("id","partnerId","projectId","purchaseId","kind","amount","currency","status","note","createdAt","updatedAt") VALUES
 ('s_pe_1','s_u_partner','s_p_meru',NULL,'ONBOARDING',30,'USDC','PAID','Onboarding stipend for Meru project',now(),now()),
 ('s_pe_2','s_u_partner','s_p_meru',NULL,'VERIFICATION',200,'USDC','PENDING','Verification milestone for Meru project',now(),now()),
 ('s_pe_3','s_u_partner','s_p_meru','s_pu_2','ROYALTY',63,'USDC','PENDING','3% royalty on 150t sale',now(),now())
ON CONFLICT ("id") DO NOTHING;

-- ── Blog posts ──────────────────────────────────────────────────────────────
INSERT INTO "BlogPost" ("id","slug","title","excerpt","body","tags","authorName","authorRole","status","publishedAt","createdAt","updatedAt") VALUES
 ('s_bp_1','why-africa-carbon','Why Africa''s carbon belongs to its communities','The value of restoration should flow to the people doing the work.','Across Africa, communities restore land every day. Kabon.Africa makes that work pay.','{"vision","community"}','Wambugu Kamotho','Founder','PUBLISHED',now(),now(),now()),
 ('s_bp_2','how-we-verify','How we verify a carbon project','Satellite NDVI, on-the-ground IoT, and an independent maker-checker review.','Every credit is backed by published methodology, satellite data, and field sensors.','{"methodology","verification"}','Kabon Team','Field Lead','PUBLISHED',now(),now(),now()),
 ('s_bp_3','the-buffer-pool','The buffer pool, explained','Why we hold a slice of every issuance in reserve.','Permanence matters. The buffer pool insures buyers against reversal events.','{"standard","buffer"}','Kabon Team',NULL,'PUBLISHED',now(),now(),now())
ON CONFLICT ("slug") DO NOTHING;

-- ── Audit log (privileged actions trail) ────────────────────────────────────
INSERT INTO "AuditLog" ("id","actorId","actorRole","action","targetType","targetId","summary","createdAt") VALUES
 ('s_al_1',(SELECT id FROM "User" WHERE email='admin@kabon.africa'),'ADMIN','verification.issue','Verification','s_v_meru','Issued 1,963.5 t for Meru Community Reforestation',now()),
 ('s_al_2',(SELECT id FROM "User" WHERE email='admin@kabon.africa'),'ADMIN','verification.issue','Verification','s_v_solar','Issued 1,275 t for Turkana Solar Mini-grid',now()),
 ('s_al_3',(SELECT id FROM "User" WHERE email='admin@kabon.africa'),'ADMIN','buffer.drawdown','BufferPool','s_pool','Drew 10 t from buffer pool (fire reversal)',now()),
 ('s_al_4',(SELECT id FROM "User" WHERE email='admin@kabon.africa'),'ADMIN','inquiry.approve','BuyerInquiry','s_bi_2','Approved buyer GreenLeaf Foods',now()),
 ('s_al_5',(SELECT id FROM "User" WHERE email='admin@kabon.africa'),'ADMIN','partner.approve','PartnerApplication','s_pa_1','Approved partner Rift Valley Community Org',now())
ON CONFLICT ("id") DO NOTHING;

-- ── Project review thread (Meru) ────────────────────────────────────────────
INSERT INTO "ProjectComment" ("id","projectId","authorId","body","kind","createdAt") VALUES
 ('s_cm_1','s_p_meru',(SELECT id FROM "User" WHERE email='owner@kabon.africa'),'Uploaded planting records and the GPS boundary.','comment',now()),
 ('s_cm_2','s_p_meru',(SELECT id FROM "User" WHERE email='admin@kabon.africa'),'Approved for verification. Forwarded to the verifier team.','approval',now()),
 ('s_cm_3','s_p_meru','s_u_verifier','Carbon assessment complete. 2,310 t CO2e verified.','verification_approved',now()),
 ('s_cm_4','s_p_meru',(SELECT id FROM "User" WHERE email='admin@kabon.africa'),'1,963.5 t issued and available to list; 346.5 t reserved in the buffer pool.','credits_issued',now())
ON CONFLICT ("id") DO NOTHING;

-- ── Satellite snapshots (Meru — rising NDVI) ────────────────────────────────
INSERT INTO "SatelliteSnapshot" ("id","projectId","ndvi","cloudCover","capturedAt","fetchedAt","source") VALUES
 ('s_ss_1','s_p_meru',0.42,6,now() - interval '120 days',now(),'sentinel-2-l2a'),
 ('s_ss_2','s_p_meru',0.49,8,now() - interval '90 days',now(),'sentinel-2-l2a'),
 ('s_ss_3','s_p_meru',0.55,5,now() - interval '60 days',now(),'sentinel-2-l2a'),
 ('s_ss_4','s_p_meru',0.61,7,now() - interval '30 days',now(),'sentinel-2-l2a'),
 ('s_ss_5','s_p_meru',0.66,4,now(),now(),'sentinel-2-l2a')
ON CONFLICT ("id") DO NOTHING;

-- ── IoT device + readings (Solar — energy meter) ────────────────────────────
INSERT INTO "IoTDevice" ("id","projectId","deviceKey","deviceType","label","active","lastSeenAt","createdAt","updatedAt") VALUES
 ('s_dev_solar','s_p_solar','dev-demo-solar-key','ENERGY_METER','Main inverter',true,now(),now(),now())
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "DeviceReading" ("id","deviceId","projectId","kwhGenerated","co2AvoidedKg","householdsServed","recordedAt","receivedAt") VALUES
 ('s_dr_1','s_dev_solar','s_p_solar',420,310,1180,now() - interval '4 days',now()),
 ('s_dr_2','s_dev_solar','s_p_solar',455,336,1190,now() - interval '3 days',now()),
 ('s_dr_3','s_dev_solar','s_p_solar',438,323,1200,now() - interval '2 days',now()),
 ('s_dr_4','s_dev_solar','s_p_solar',470,347,1205,now() - interval '1 days',now()),
 ('s_dr_5','s_dev_solar','s_p_solar',462,341,1210,now(),now())
ON CONFLICT ("id") DO NOTHING;

COMMIT;
