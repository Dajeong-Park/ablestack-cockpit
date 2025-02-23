/*
 * This file is part of Cockpit.
 *
 * Copyright (C) 2017 Red Hat, Inc.
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

import '../lib/patternfly/patternfly-cockpit.scss';
import "polyfills";

import cockpit from "cockpit";

import React from "react";
import ReactDOM from 'react-dom';

import { ApplicationList } from "./application-list.jsx";
import { Application } from "./application.jsx";
import { get_metainfo_db } from "./appstream.js";

import "page.scss";

const metainfo_db = get_metainfo_db();

function render_list() {
    ReactDOM.render(<ApplicationList metainfo_db={metainfo_db} />,
                    document.getElementById('list-page'));
}

function render_app() {
    ReactDOM.render(<Application metainfo_db={metainfo_db} id={cockpit.location.path[0]} />,
                    document.getElementById('app-page'));
}

function show(id) {
    document.getElementById(id).style.display = 'block';
}

function hide(id) {
    document.getElementById(id).style.display = 'none';
}

function navigate() {
    const path = cockpit.location.path;

    if (path.length === 0) {
        show('list-page');
        hide('app-page');
    } else if (path.length === 1) {
        render_app();
        hide('list-page');
        show('app-page');
    } else { /* redirect */
        console.warn("not a apps location: " + path);
        cockpit.location = '';
    }
}

document.addEventListener("DOMContentLoaded", function () {
    cockpit.translate();

    metainfo_db.addEventListener("changed", () => {
        render_list();
        render_app();
    });

    render_list();
    cockpit.addEventListener("locationchanged", navigate);
    navigate();

    document.body.removeAttribute('hidden');
});
