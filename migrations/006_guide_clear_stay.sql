-- Guide: "Clear the Stay zones" (pc1864). Walks [001] and turns every Stay/Away zone type back into
-- its always-armed type. Example: zone 5 was 05, becomes 04. Ships unverified until run on a real panel.

INSERT INTO guide (panel_model_id, slug, title, summary, danger, verified, position)
	VALUES ((SELECT id FROM panel_model WHERE slug = 'pc1864'), $q$clear-stay$q$, $q$Clear the Stay zones$q$,
	$q$Stay arming skips zones whose type is 05, 06, 32 or 37. Change those back to normal types so Stay leaves nothing out. Example: zone 5.$q$,
	false, false, 3);

INSERT INTO guide_step (guide_id, position, title, keys, note, warning, section_ref)
	SELECT g.id, s.position, s.title, s.keys, s.note, s.warning, s.section_ref
	FROM guide g
	JOIN panel_model m ON m.id = g.panel_model_id AND m.slug = 'pc1864'
	CROSS JOIN (VALUES
		(1, $q$Enter installer programming$q$, $q$* 8 {installer}$q$,
			$q$Do this while the system is disarmed. Armed light on = waiting for a section number.$q$, NULL, NULL::integer),
		(2, $q$Open zone types$q$, $q$0 0 1$q$,
			$q$[001] = zones 1–16. Zone 1's type shows first. Stay types: 05 Interior Stay/Away, 06 Delay Stay/Away, 32 Instant Stay/Away, 37 Night.$q$,
			NULL, 1),
		(3, $q$Walk the zones and swap each Stay type$q$, $q$> > > > 0 4$q$,
			$q$For each zone: press > to keep it, or type its new type, which also moves on. 05 → 04, 06 → 01, 32 → 03, 37 → 04. Example shown: zones 1–4 kept, zone 5 was 05 so type 04. Carry on to zone 16.$q$,
			$q$Two digits always overwrite the zone you're on. Only type on zones that show a Stay type, and write down what each one was.$q$, 1),
		(4, $q$Save and leave the section$q$, $q$#$q$,
			$q$# keeps every change so far. Zones 17 and up: repeat steps 2–3 with [002] (17–32), [003] or [004]. A changed zone's attributes in [101]–[164] go back to defaults, so check them.$q$,
			NULL, NULL),
		(5, $q$Leave installer programming$q$, $q$#$q$,
			$q$Arm Stay to check: the Bypass light should stay off, because no zones are skipped any more.$q$, NULL, NULL)
	) AS s (position, title, keys, note, warning, section_ref)
	WHERE g.slug = 'clear-stay';

---- create above / drop below ----

DELETE FROM guide
	WHERE slug = 'clear-stay' AND panel_model_id = (SELECT id FROM panel_model WHERE slug = 'pc1864');
