import cockpit from "cockpit";
import { mustache } from "mustache";

import '../lib/patternfly/patternfly-cockpit.scss';

const _ = cockpit.gettext;
const C_ = cockpit.gettext;

document.addEventListener("DOMContentLoaded", () => {
    cockpit.translate();

    let text = _("Empty");
    document.getElementById("underscore-empty").textContent = text;

    text = _("verb", "Empty");
    document.getElementById("underscore-context-empty").textContent = text;

    text = C_("verb", "Empty");
    document.getElementById("cunderscore-context-empty").textContent = text;

    text = cockpit.gettext("Control");
    document.getElementById("gettext-control").textContent = text;

    text = cockpit.gettext("key", "Control");
    document.getElementById("gettext-context-control").textContent = text;

    text = cockpit.ngettext("$0 disk is missing", "$0 disks are missing", 1);
    document.getElementById("ngettext-disks-1").textContent = text;

    text = cockpit.ngettext("$0 disk is missing", "$0 disks are missing", 2);
    document.getElementById("ngettext-disks-2").textContent = text;

    text = cockpit.ngettext("disk-non-rotational", "$0 disk is missing", "$0 disks are missing", 1);
    document.getElementById("ngettext-context-disks-1").textContent = text;

    text = cockpit.ngettext("disk-non-rotational", "$0 disk is missing", "$0 disks are missing", 2);
    document.getElementById("ngettext-context-disks-2").textContent = text;

    const template = document.getElementById("mustache-input").textContent;
    const output = mustache.render(template);
    document.getElementById("mustache-output").innerHTML = output;

    cockpit.transport.wait(() => document.body.removeAttribute("hidden"));
});
