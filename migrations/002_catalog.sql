-- Panel catalog: manufacturers, panel models, keypads, menu sections, keypad commands, lookups, guides.
-- jsonb columns are validated by the zod schemas in lib/content/schemas.ts when read.

CREATE TABLE manufacturer (
	id serial PRIMARY KEY,
	slug text NOT NULL UNIQUE,
	name text NOT NULL
);

CREATE TABLE panel_family (
	id serial PRIMARY KEY,
	manufacturer_id integer NOT NULL REFERENCES manufacturer(id) ON DELETE CASCADE,
	slug text NOT NULL UNIQUE,
	name text NOT NULL,
	engine_key text NOT NULL
);

CREATE TABLE panel_model (
	id serial PRIMARY KEY,
	family_id integer NOT NULL REFERENCES panel_family(id) ON DELETE CASCADE,
	slug text NOT NULL UNIQUE,
	name text NOT NULL,
	firmware text NOT NULL DEFAULT '',
	installer_code_default text NOT NULL,
	master_code_default text NOT NULL,
	source_doc text NOT NULL DEFAULT ''
);

CREATE TABLE keypad_model (
	id serial PRIMARY KEY,
	family_id integer NOT NULL REFERENCES panel_family(id) ON DELETE CASCADE,
	slug text NOT NULL,
	name text NOT NULL,
	component_key text NOT NULL,
	description text NOT NULL DEFAULT '',
	display_type text NOT NULL CHECK (display_type IN ('text', 'icons', 'lights')),
	light_count integer,
	UNIQUE (family_id, slug)
);

CREATE TABLE panel_model_keypad (
	panel_model_id integer NOT NULL REFERENCES panel_model(id) ON DELETE CASCADE,
	keypad_model_id integer NOT NULL REFERENCES keypad_model(id) ON DELETE CASCADE,
	is_default boolean NOT NULL DEFAULT false,
	PRIMARY KEY (panel_model_id, keypad_model_id)
);

CREATE TABLE menu_group (
	id serial PRIMARY KEY,
	panel_model_id integer NOT NULL REFERENCES panel_model(id) ON DELETE CASCADE,
	slug text NOT NULL,
	label text NOT NULL,
	position integer NOT NULL,
	UNIQUE (panel_model_id, slug)
);

CREATE TABLE section (
	id serial PRIMARY KEY,
	panel_model_id integer NOT NULL REFERENCES panel_model(id) ON DELETE CASCADE,
	group_id integer NOT NULL REFERENCES menu_group(id) ON DELETE CASCADE,
	slug text NOT NULL,
	num integer,
	range_start integer,
	range_end integer,
	kind text NOT NULL CHECK (kind IN ('data', 'toggle', 'sub', 'phone', 'action', 'module')),
	label text NOT NULL,
	description text NOT NULL DEFAULT '',
	sub_digits integer,
	rule jsonb,
	entries jsonb,
	options jsonb,
	subs jsonb,
	tips jsonb NOT NULL DEFAULT '[]',
	related jsonb NOT NULL DEFAULT '[]',
	pages jsonb NOT NULL DEFAULT '[]',
	confirm boolean NOT NULL DEFAULT false,
	danger boolean NOT NULL DEFAULT false,
	verified boolean NOT NULL DEFAULT true,
	position integer NOT NULL,
	UNIQUE (panel_model_id, slug)
);
CREATE INDEX section_group_idx ON section (group_id, position);

CREATE TABLE keypad_command (
	id serial PRIMARY KEY,
	panel_model_id integer NOT NULL REFERENCES panel_model(id) ON DELETE CASCADE,
	slug text NOT NULL,
	keys text NOT NULL,
	label text NOT NULL,
	kind text NOT NULL DEFAULT 'command',
	description text NOT NULL DEFAULT '',
	position integer NOT NULL,
	payload jsonb NOT NULL DEFAULT '{}',
	UNIQUE (panel_model_id, slug)
);

CREATE TABLE lookup (
	panel_model_id integer NOT NULL REFERENCES panel_model(id) ON DELETE CASCADE,
	key text NOT NULL,
	values jsonb NOT NULL,
	PRIMARY KEY (panel_model_id, key)
);

CREATE TABLE guide (
	id serial PRIMARY KEY,
	panel_model_id integer NOT NULL REFERENCES panel_model(id) ON DELETE CASCADE,
	slug text NOT NULL,
	title text NOT NULL,
	summary text NOT NULL DEFAULT '',
	danger boolean NOT NULL DEFAULT false,
	verified boolean NOT NULL DEFAULT false,
	position integer NOT NULL DEFAULT 0,
	UNIQUE (panel_model_id, slug)
);

CREATE TABLE guide_step (
	id serial PRIMARY KEY,
	guide_id integer NOT NULL REFERENCES guide(id) ON DELETE CASCADE,
	position integer NOT NULL,
	title text NOT NULL,
	keys text NOT NULL DEFAULT '',
	note text NOT NULL DEFAULT '',
	warning text,
	section_ref integer,
	UNIQUE (guide_id, position)
);

CREATE TABLE user_keypad_choice (
	user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
	panel_model_id integer NOT NULL REFERENCES panel_model(id) ON DELETE CASCADE,
	keypad_model_id integer NOT NULL REFERENCES keypad_model(id) ON DELETE CASCADE,
	PRIMARY KEY (user_id, panel_model_id)
);

---- create above / drop below ----

DROP TABLE IF EXISTS user_keypad_choice;
DROP TABLE IF EXISTS guide_step;
DROP TABLE IF EXISTS guide;
DROP TABLE IF EXISTS lookup;
DROP TABLE IF EXISTS keypad_command;
DROP TABLE IF EXISTS section;
DROP TABLE IF EXISTS menu_group;
DROP TABLE IF EXISTS panel_model_keypad;
DROP TABLE IF EXISTS keypad_model;
DROP TABLE IF EXISTS panel_model;
DROP TABLE IF EXISTS panel_family;
DROP TABLE IF EXISTS manufacturer;
