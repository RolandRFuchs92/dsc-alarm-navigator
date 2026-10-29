-- Fix "Create a new partition" step 4: its keys ended with #, so the keypad left [203] before
-- showing the zones. Step 4 now stays in [203]; a new step 5 presses #. Later steps move down one.
-- Two-step shift because (guide_id, position) is unique.

UPDATE guide_step SET position = position + 100
	WHERE position >= 5 AND guide_id = (SELECT g.id FROM guide g JOIN panel_model m ON m.id = g.panel_model_id
		WHERE m.slug = 'pc1864' AND g.slug = 'create-partition');
UPDATE guide_step SET position = position - 99
	WHERE position >= 105 AND guide_id = (SELECT g.id FROM guide g JOIN panel_model m ON m.id = g.panel_model_id
		WHERE m.slug = 'pc1864' AND g.slug = 'create-partition');

UPDATE guide_step SET keys = $q$2 0 3$q$,
	note = $q$Options 1–8 = zones 9–16. A number shows for each one that's ON, a dash for OFF (-------- = none). Press the number of any ON option to turn it off. Don't press dashes: every press flips the option.$q$
	WHERE position = 4 AND guide_id = (SELECT g.id FROM guide g JOIN panel_model m ON m.id = g.panel_model_id
		WHERE m.slug = 'pc1864' AND g.slug = 'create-partition');

INSERT INTO guide_step (guide_id, position, title, keys, note, warning, section_ref)
	SELECT g.id, 5, $q$Leave [203]$q$, $q$#$q$, $q$Saves the options and goes back to waiting for a section number.$q$, NULL, NULL
	FROM guide g JOIN panel_model m ON m.id = g.panel_model_id
	WHERE m.slug = 'pc1864' AND g.slug = 'create-partition';

---- create above / drop below ----

DELETE FROM guide_step
	WHERE position = 5 AND guide_id = (SELECT g.id FROM guide g JOIN panel_model m ON m.id = g.panel_model_id
		WHERE m.slug = 'pc1864' AND g.slug = 'create-partition');

UPDATE guide_step SET keys = $q$2 0 3 #$q$,
	note = $q$Look at options 1–8: any that are ON are zones 9–16 still on partition 1. Press that number to turn it off, then press #.$q$
	WHERE position = 4 AND guide_id = (SELECT g.id FROM guide g JOIN panel_model m ON m.id = g.panel_model_id
		WHERE m.slug = 'pc1864' AND g.slug = 'create-partition');

UPDATE guide_step SET position = position + 100
	WHERE position >= 6 AND guide_id = (SELECT g.id FROM guide g JOIN panel_model m ON m.id = g.panel_model_id
		WHERE m.slug = 'pc1864' AND g.slug = 'create-partition');
UPDATE guide_step SET position = position - 101
	WHERE position >= 106 AND guide_id = (SELECT g.id FROM guide g JOIN panel_model m ON m.id = g.panel_model_id
		WHERE m.slug = 'pc1864' AND g.slug = 'create-partition');
