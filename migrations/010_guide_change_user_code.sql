-- Guide: "Change a user code" (x64). User program mode, option 1 (user manual 700-398-01J).
-- Example: the master code 1234 becomes 4321. Keys are guide tokens (lib/guides/keys.ts). Ships unverified.

INSERT INTO guide (panel_model_id, slug, title, summary, danger, verified, position)
	VALUES ((SELECT id FROM panel_model WHERE slug = 'x64'), $q$change-user-code$q$, $q$Change a user code$q$,
	$q$Changes a code in user program mode, option 1. The example changes the master code 1234 to 4321.$q$,
	false, false, 1);

INSERT INTO guide_step (guide_id, position, title, keys, note, warning, section_ref)
	SELECT g.id, s.position, s.title, s.keys, s.note, s.warning, s.section_ref
	FROM guide g
	JOIN panel_model m ON m.id = g.panel_model_id AND m.slug = 'x64'
	CROSS JOIN (VALUES
		(1, $q$Make sure the system is disarmed$q$, $q$$q$,
			$q$User program mode only opens while the system is disarmed. The new code must be unique: no other user may already have it. Codes are 4 digits unless location 23 is set to 6.$q$, NULL, NULL::integer),
		(2, $q$Start user program mode$q$, $q$hold*$q$,
			$q$Hold * until the keypad beeps. ARM and READY flash alternately.$q$, NULL, NULL),
		(3, $q$Enter the master code$q$, $q${master} *$q$,
			$q$Only the master code (user code 1) opens user program mode. A long beep sounds and READY flashes.$q$, NULL, NULL),
		(4, $q$Choose option 1 (edit a code)$q$, $q$1 *$q$,
			$q$READY and ARM flash together.$q$, NULL, NULL),
		(5, $q$Enter the old code$q$, $q${user-code} *$q$,
			$q$READY and AWAY flash, with ARM on. To change the master code itself, enter the master code here. If you don't know the old code, option 5 shows the slot a code is in and option 3 sets a code by slot number.$q$, NULL, NULL),
		(6, $q$Enter the new code$q$, $q${new-code} *$q$,
			$q$READY and ARM flash together again. To change more codes, repeat steps 5 and 6.$q$, NULL, NULL),
		(7, $q$Leave user program mode$q$, $q$# #$q$,
			$q$The first # leaves the option, the second leaves user program mode. The keypad is idle again.$q$, NULL, NULL)
	) AS s (position, title, keys, note, warning, section_ref)
	WHERE g.slug = 'change-user-code' AND g.panel_model_id = m.id;

---- create above / drop below ----

DELETE FROM guide
	WHERE slug = 'change-user-code' AND panel_model_id = (SELECT id FROM panel_model WHERE slug = 'x64');
