-- Guide: "Add a new zone" (x64). Zone 9 as an Instant zone (type 04) in [002], allocated to partition 1 in [201],
-- properties in [109] checked only (installer manual 700-398-02O). Keys are guide tokens. Ships unverified.

INSERT INTO guide (panel_model_id, slug, title, summary, danger, verified, position)
	VALUES ((SELECT id FROM panel_model WHERE slug = 'x64'), $q$add-zone$q$, $q$Add a new zone$q$,
	$q$Sets up a new zone: its type, then which partition it belongs to. Zone 9 as an Instant zone is the example. Zone 9 needs the plug-in zone expander (P/N 860-06-X-08PI).$q$,
	false, false, 2);

INSERT INTO guide_step (guide_id, position, title, keys, note, warning, section_ref)
	SELECT g.id, s.position, s.title, s.keys, s.note, s.warning, s.section_ref
	FROM guide g
	JOIN panel_model m ON m.id = g.panel_model_id AND m.slug = 'x64'
	CROSS JOIN (VALUES
		(1, $q$Enter installer programming$q$, $q$# {installer} *$q$,
			$q$Do this while the system is disarmed. READY flashes when you are in.$q$,
			$q$Zone 9 needs the plug-in zone expander (P/N 860-06-X-08PI) fitted and enrolled, or the panel can't see the zone.$q$, NULL::integer),
		(2, $q$Open zones 9 to 16$q$, $q$2 *$q$,
			$q$Location 2 holds the types of zones 9 to 16. You start on zone 9.$q$, NULL, 2),
		(3, $q$Set zone 9 to Instant$q$, $q$4 *$q$,
			$q$04 = Instant zone. The cursor moves on to zone 10.$q$,
			$q$A violation of an Instant zone registers an alarm condition when the system is armed.$q$, 2),
		(4, $q$Back to the top$q$, $q$#$q$,
			$q$# leaves the location and returns to waiting for a location number. If READY is already flashing with ARM and AWAY off, you are back at the top: skip this #.$q$, NULL, NULL),
		(5, $q$Open partition 1 zones$q$, $q$2 0 1 *$q$,
			$q$Location 201 allocates zones to partition 1. Page 1 covers zones 1 to 16, and READY marks the page.$q$, NULL, 201),
		(6, $q$Switch zone 9 on$q$, $q$9 *$q$,
			$q$Light 9 comes on when zone 9 belongs to partition 1.$q$,
			$q$The manual doesn't confirm that 9 * is how you toggle a zone in 201 to 208. If light 9 doesn't come on, stop and report it.$q$, 201),
		(7, $q$Back to the top$q$, $q$#$q$,
			$q$Returns to waiting for a location number.$q$, NULL, NULL),
		(8, $q$Check zone 9's properties$q$, $q$1 0 9 *$q$,
			$q$Location 109 holds zone 9's properties. Check that light 6 is on (bypassing allowed, the default) and change nothing.$q$, NULL, 109),
		(9, $q$Leave the location$q$, $q$#$q$,
			$q$Leaves 109 without changing anything.$q$, NULL, NULL),
		(10, $q$Leave installer programming$q$, $q$#$q$,
			$q$The keypad is idle again. Zone 9 is now an Instant zone in partition 1.$q$, NULL, NULL)
	) AS s (position, title, keys, note, warning, section_ref)
	WHERE g.slug = 'add-zone' AND g.panel_model_id = m.id;

---- create above / drop below ----

DELETE FROM guide
	WHERE slug = 'add-zone' AND panel_model_id = (SELECT id FROM panel_model WHERE slug = 'x64');
