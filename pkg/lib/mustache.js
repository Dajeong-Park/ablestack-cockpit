/*
 * This file is part of Cockpit.
 *
 * Copyright (C) 2016 Red Hat, Inc.
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

import cockpit from "cockpit";
import orig_mustache from "mustache/mustache";

/*
 * Turns a mustache template into a translated mustache template
 * by preparsing it and translating it.
 */
let cache = { };

function translate(template) {
    if (template in cache)
        return cache[template];
    const div = document.createElement("div");
    div.innerHTML = template;
    cockpit.translate(div);
    const result = div.innerHTML;
    cache[template] = result;
    return result;
}

/* Just like the mustache object, except for translated */
export const mustache = cockpit.extend({ }, orig_mustache, {
    render: function render(template, view, partials) {
        if (!view)
            view = {};

        return translate(orig_mustache.render(template, view, partials));
    },
    to_html: function to_html(template, view, partials, send) {
        if (!view)
            view = {};

        return translate(orig_mustache.to_html(template, view, partials, send));
    },
    clearCache: function clearCache() {
        cache = { };
        return orig_mustache.clearCache();
    }
});
