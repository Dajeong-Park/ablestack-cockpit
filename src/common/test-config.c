/*
 * This file is part of Cockpit.
 *
 * Copyright (C) 2014 Red Hat, Inc.
 *
 * Cockpit is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation; either version 2.1 of the License, or
 * (at your option) any later version.
 *
 * Cockpit is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with Cockpit; If not, see <http://www.gnu.org/licenses/>.
 */

#include "config.h"

#include "cockpitconf.h"

#include "cockpitsystem.h"
#include "cockpittest.h"

#include <glib.h>

/* Mock override cockpitconf.c */
extern const gchar *cockpit_config_file;

static void
test_get_strings (void)
{
  cockpit_config_file = SRCDIR "/src/ws/mock-config/cockpit/cockpit.conf";

  g_assert_null (cockpit_conf_string ("bad-section", "value"));
  g_assert_null (cockpit_conf_string ("Section1", "value"));
  g_assert_cmpstr (cockpit_conf_string ("Section2", "value1"),
                   ==, "string");
  g_assert_cmpstr (cockpit_conf_string ("Section2", "value2"),
                   ==, "commas, or spaces");

  /* Case insensitive */
  g_assert_cmpstr (cockpit_conf_string ("sectiON2", "Value2"),
                   ==, "commas, or spaces");

  cockpit_conf_cleanup ();
}

static void
test_get_bool (void)
{
  cockpit_config_file = SRCDIR "/src/ws/mock-config/cockpit/cockpit.conf";

  g_assert_true (cockpit_conf_bool ("bad-section", "value", TRUE));
  g_assert_false (cockpit_conf_bool ("bad-section", "value", FALSE));
  g_assert_false (cockpit_conf_bool ("Section2", "missing", FALSE));

  g_assert_true (cockpit_conf_bool ("Section2", "true", FALSE));
  g_assert_true (cockpit_conf_bool ("Section2", "truelower", FALSE));
  g_assert_true (cockpit_conf_bool ("Section2", "one", FALSE));
  g_assert_true (cockpit_conf_bool ("Section2", "yes", FALSE));

  g_assert_false (cockpit_conf_bool ("Section2", "value1", TRUE));

  cockpit_conf_cleanup ();
}

static void
test_get_uint (void)
{
  cockpit_config_file = SRCDIR "/src/ws/mock-config/cockpit/cockpit.conf";

  g_assert_cmpuint (cockpit_conf_uint ("bad-section", "value", 1, 999, 0), ==,  1);
  g_assert_cmpuint (cockpit_conf_uint ("Section2", "missing", 1, 999, 0), ==,  1);
  g_assert_cmpuint (cockpit_conf_uint ("Section2", "mixed", 10, 999, 0), ==,  10);
  g_assert_cmpuint (cockpit_conf_uint ("Section2", "value1", 10, 999, 0), ==,  10);
  g_assert_cmpuint (cockpit_conf_uint ("Section2", "toolarge", 10, 999, 0), ==,  10);
  g_assert_cmpuint (cockpit_conf_uint ("Section2", "one", 10, 999, 0), ==,  1);
  g_assert_cmpuint (cockpit_conf_uint ("Section2", "one", 1, 999, 2), ==,  2);
  g_assert_cmpuint (cockpit_conf_uint ("Section2", "one", 1, 0, 0), ==,  0);
  cockpit_conf_cleanup ();
}

static void
test_get_strvs (void)
{
  const gchar **list = NULL;

  cockpit_config_file = SRCDIR "/src/ws/mock-config/cockpit/cockpit.conf";

  g_assert_null (cockpit_conf_strv ("bad-section", "value", ' '));
  g_assert_null (cockpit_conf_strv ("Section1", "value", ' '));

  /* empty list */
  list = cockpit_conf_strv ("Section2", "empty", ':');
  g_assert_null (list[0]);

  /* list with one element */
  list = cockpit_conf_strv ("Section2", "value1", ' ');
  g_assert_cmpstr (list[0], ==, "string");
  g_assert_null (list[1]);

  /* list with space separator */
  list = cockpit_conf_strv ("Section2", "value2", ' ');
  g_assert_cmpstr (list[0], ==, "commas,");
  g_assert_cmpstr (list[1], ==, "or");
  g_assert_cmpstr (list[2], ==, "spaces");
  g_assert_null (list[3]);

  /* list with comma separator */
  list = cockpit_conf_strv ("Section2", "value3", ',');
  g_assert_cmpstr (list[0], ==, "commas");
  g_assert_cmpstr (list[1], ==, " or spaces");
  g_assert_null (list[2]);

  /* list with only a separator */
  list = cockpit_conf_strv ("Section2", "emptystrv", ':');
  g_assert_cmpstr (list[0], ==, "");
  g_assert_cmpstr (list[1], ==, "");
  g_assert_null (list[2]);

  /* list with empty value in the middle */
  list = cockpit_conf_strv ("Section2", "strvemptyitems", ':');
  g_assert_cmpstr (list[0], ==, "one");
  g_assert_cmpstr (list[1], ==, "");
  g_assert_cmpstr (list[2], ==, "three");
  g_assert_null (list[3]);

  cockpit_conf_cleanup ();
}

static void
test_load_dir (void)
{
  cockpit_setenv_check("XDG_CONFIG_DIRS", "/does-not-exist:" SRCDIR "/src/ws/mock-config", TRUE);
  cockpit_config_file = "cockpit.conf";

  g_assert_cmpstr (cockpit_conf_string ("Section2", "value1"), ==, "string");
  g_assert_cmpstr (cockpit_conf_get_dirs ()[1], ==, SRCDIR "/src/ws/mock-config");
  cockpit_conf_cleanup ();
}

static void
test_fail_load (void)
{
  cockpit_config_file = SRCDIR "/does-not-exist";
  g_assert_null (cockpit_conf_string ("Section2", "value1"));
  cockpit_conf_cleanup ();
}

int
main (int argc,
      char *argv[])
{
  cockpit_test_init (&argc, &argv);

  g_test_add_func ("/conf/test-bool", test_get_bool);
  g_test_add_func ("/conf/test-uint", test_get_uint);
  g_test_add_func ("/conf/test-strings", test_get_strings);
  g_test_add_func ("/conf/test-strvs", test_get_strvs);
  g_test_add_func ("/conf/fail_load", test_fail_load);
  g_test_add_func ("/conf/load_dir", test_load_dir);
  return g_test_run ();
}
