-- Guide: "Create a new Stay" (pc1864). Makes the chosen zones Stay/Away types so Stay arming skips them.
-- Example: zones 5–8 are motion sensors, type 05. Ships unverified until run on a real panel.

INSERT INTO guide (panel_model_id, slug, title, summary, danger, verified, position)
	VALUES ((SELECT id FROM panel_model WHERE slug = 'pc1864'), $q$create-stay$q$, $q$Create a new Stay$q$,
	$q$Choose which zones Stay arming leaves off, e.g. indoor motion sensors while you're home. Example: zones 5–8 become Interior Stay/Away (05).$q$,
	false, false, 4);

INSERT INTO guide_step (guide_id, position, title, keys, note, warning, section_ref)
	SELECT g.id, s.position, s.title, s.keys, s.note, s.warning, s.section_ref
	FROM guide g
	JOIN panel_model m ON m.id = g.panel_model_id AND m.slug = 'pc1864'
	CROSS JOIN (VALUES
		(1, $q$Enter installer programming$q$, $q$* 8 {installer}$q$,
			$q$Do this while the system is disarmed. Armed light on = waiting for a section number.$q$, NULL, NULL::integer),
		(2, $q$Open zone types$q$, $q$0 0 1$q$,
			$q$[001] = zones 1–16, [002] = 17–32, [003] = 33–48, [004] = 49–64. Zone 1's type shows first.$q$, NULL, 1),
		(3, $q$Move to the first zone$q$, $q$> > > >$q$,
			$q$Each > moves one zone without changing it. Four presses = zone 5.$q$,
			$q$Don't type digits on the way. They would overwrite zones 1–4.$q$, 1),
		(4, $q$Make zones 5–8 Stay zones$q$, $q$0 5 0 5 0 5 0 5$q$,
			$q$Each pair sets one zone and moves on. Pick the type by what the zone is: motion sensor 05 (Interior Stay/Away), entry door with a delay 06 (Delay Stay/Away), other door or window 32 (Instant Stay/Away). Skip a zone in between with >.$q$,
			$q$Write down each zone's old type first. Never use these types on fire, panic or 24-hour zones.$q$, 1),
		(5, $q$Save and leave the section$q$, $q$#$q$,
			$q$# keeps every change so far. A changed zone's attributes in [101]–[164] go back to defaults, so check them.$q$,
			NULL, NULL),
		(6, $q$Leave installer programming$q$, $q$#$q$,
			$q$Arm Stay to check: enter your code and don't leave through the entry door. When it arms, the Bypass light comes on because zones 5–8 are being skipped.$q$,
			NULL, NULL)
	) AS s (position, title, keys, note, warning, section_ref)
	WHERE g.slug = 'create-stay';

---- create above / drop below ----

DELETE FROM guide
	WHERE slug = 'create-stay' AND panel_model_id = (SELECT id FROM panel_model WHERE slug = 'pc1864');
