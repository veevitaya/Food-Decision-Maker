CREATE TABLE IF NOT EXISTS user_saved_posts (
  id serial PRIMARY KEY,
  line_user_id text NOT NULL,
  restaurant_id integer NOT NULL,
  saved_at timestamp DEFAULT now() NOT NULL,
  UNIQUE (line_user_id, restaurant_id)
);

CREATE TABLE IF NOT EXISTS user_liked_posts (
  id serial PRIMARY KEY,
  line_user_id text NOT NULL,
  restaurant_id integer NOT NULL,
  liked_at timestamp DEFAULT now() NOT NULL,
  UNIQUE (line_user_id, restaurant_id)
);
