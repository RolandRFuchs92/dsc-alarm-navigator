-- Guide: "Create a new partition" (pc1864). Adds partition 2 using zones 9–16.
-- Keys are guide tokens (lib/guides/keys.ts). Ships unverified until run on a real panel.

INSERT INTO guide (panel_model_id, slug, title, summary, danger, verified, position)
	VALUES ((SELECT id FROM panel_model WHERE slug = 'pc1864'), $q$create-partition$q$, $q$Create a new partition$q$,
	$q$Add partition 2 using zones 9–16: turn it on, move the zones, set its delays, give it a keypad and let users arm it.$q$,
	false, false, 1);

INSERT INTO guide_step (guide_id, position, title, keys, note, warning, section_ref)
	SELECT g.id, s.position, s.title, s.keys, s.note, s.warning, s.section_ref
	FROM guide g
	JOIN panel_model m ON m.id = g.panel_model_id AND m.slug = 'pc1864'
	CROSS JOIN (VALUES
		(1, $q$Enter installer programming$q$, $q$* 8 {installer}$q$,
			$q$Armed light on = waiting for a section number.$q$, NULL, NULL::integer),
		(2, $q$Turn the partition on$q$, $q$2 0 1 2 #$q$,
			$q$Toggle 2 shows on the display. Partition 1 is always on.$q$, NULL, 201),
		(3, $q$Give it zones 9–16$q$, $q$2 1 1 1 2 3 4 5 6 7 8 #$q$,
			$q$[210]–[217] are partition 2's zone sections; [211] = zones 9–16.$q$, NULL, 211),
		(4, $q$Remove those zones from partition 1$q$, $q$2 0 3 1 2 3 4 5 6 7 8 #$q$,
			$q$Only if the zones were on partition 1.$q$,
			$q$A zone left on both partitions only arms when both are armed.$q$, 203),
		(5, $q$Check the zone types$q$, $q$0 0 1 #$q$,
			$q$View only: zones 9–16 are in [001]. Set types if they've never been used.$q$, NULL, 1),
		(6, $q$Set entry/exit delays$q$, $q$0 0 5 0 2 0 3 0 0 4 5 1 2 0 # #$q$,
			$q$Sub-section [02] = partition 2: Entry 1, Entry 2, Exit (defaults 030/045/120).$q$, NULL, 5),
		(7, $q$Assign this keypad to partition 2$q$, $q$0 0 0 0 2 2 # #$q$,
			$q$Do this at the keypad that will run partition 2. 22 = partition 2, slot 2. Each keypad needs its own slot.$q$, NULL, 0),
		(8, $q$Rescan modules$q$, $q$9 0 2$q$,
			$q$The panel rescans keypads and modules. Wait for it to finish.$q$, NULL, 902),
		(9, $q$Leave installer programming$q$, $q$#$q$,
			$q$$q$, NULL, NULL),
		(10, $q$Give users access$q$, $q$* 5 {master} 9 8 0 2 2 #$q$,
			$q$Outside installer mode. 02 = user 2; press 2 to toggle partition 2 for that user. Repeat per user.$q$, NULL, NULL)
	) AS s (position, title, keys, note, warning, section_ref)
	WHERE g.slug = 'create-partition';

---- create above / drop below ----

DELETE FROM guide
	WHERE slug = 'create-partition' AND panel_model_id = (SELECT id FROM panel_model WHERE slug = 'pc1864');
