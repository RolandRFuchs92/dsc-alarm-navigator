-- Guide: "Permanently bypass a zone" (pc1864). Makes zone 5 a Null Zone (type 00) in [001].
-- Keys are guide tokens (lib/guides/keys.ts). Ships unverified until run on a real panel.

INSERT INTO guide (panel_model_id, slug, title, summary, danger, verified, position)
	VALUES ((SELECT id FROM panel_model WHERE slug = 'pc1864'), $q$bypass-zone$q$, $q$Permanently bypass a zone$q$,
	$q$A [*][1] bypass clears every time you disarm. To switch a zone off for good, set its type to 00 (Null Zone). Example: zone 5.$q$,
	false, false, 2);

INSERT INTO guide_step (guide_id, position, title, keys, note, warning, section_ref)
	SELECT g.id, s.position, s.title, s.keys, s.note, s.warning, s.section_ref
	FROM guide g
	JOIN panel_model m ON m.id = g.panel_model_id AND m.slug = 'pc1864'
	CROSS JOIN (VALUES
		(1, $q$Enter installer programming$q$, $q$* 8 {installer}$q$,
			$q$Do this while the system is disarmed. Armed light on = waiting for a section number.$q$, NULL, NULL::integer),
		(2, $q$Open zone definitions$q$, $q$0 0 1$q$,
			$q$[001] = zones 1–16, [002] = 17–32, [003] = 33–48, [004] = 49–64. Zone 1's type shows first.$q$, NULL, 1),
		(3, $q$Move to zone 5$q$, $q$> > > >$q$,
			$q$Each > moves one zone. For zone 21, open [002] and press > four times. Write down the type shown (e.g. 04) in case you want it back.$q$,
			$q$Don't type digits on the way. They would overwrite zones 1–4.$q$, 1),
		(4, $q$Set it to Null Zone$q$, $q$0 0$q$,
			$q$00 = Null Zone: the panel ignores the zone completely. The cursor moves on to zone 6.$q$,
			$q$The zone stops protecting entirely, even when armed. Don't null a fire, panic or hold-up zone while its device is still in use.$q$, 1),
		(5, $q$Save and leave the section$q$, $q$#$q$,
			$q$# keeps everything typed so far and goes back to waiting for a section number.$q$, NULL, NULL),
		(6, $q$Leave installer programming$q$, $q$#$q$,
			$q$The zone no longer shows as open and won't stop you arming. To undo: open [001] again, move to zone 5 and type the old type back.$q$, NULL, NULL)
	) AS s (position, title, keys, note, warning, section_ref)
	WHERE g.slug = 'bypass-zone';

---- create above / drop below ----

DELETE FROM guide
	WHERE slug = 'bypass-zone' AND panel_model_id = (SELECT id FROM panel_model WHERE slug = 'pc1864');
