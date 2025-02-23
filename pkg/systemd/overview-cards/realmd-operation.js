import jQuery from "jquery";
import cockpit from "cockpit";
import { superuser } from "superuser";
import * as packagekit from "packagekit.js";
import { install_dialog } from "cockpit-components-install-dialog.jsx";
import "patterns";

import operation_html from "raw-loader!./realmd-operation.html";

const _ = cockpit.gettext;

const MANAGER = "/org/freedesktop/realmd";

const SERVICE = "org.freedesktop.realmd.Service";
const PROVIDER = "org.freedesktop.realmd.Provider";
const KERBEROS = "org.freedesktop.realmd.Kerberos";
const KERBEROS_MEMBERSHIP = "org.freedesktop.realmd.KerberosMembership";
const REALM = "org.freedesktop.realmd.Realm";

function instance(realmd, mode, realm, state) {
    const dialog = jQuery.parseHTML(operation_html)[0];

    /* Scope the jQuery selector to our dialog */
    const $ = function(selector, context) {
        return new jQuery.fn.init(selector, context || dialog); // eslint-disable-line new-cap
    };
    $.fn = $.prototype = jQuery.fn;
    jQuery.extend($, jQuery);

    let error_message = null;
    let operation = null;
    let checking = null;
    let checked = null;
    let kerberos_membership = null;
    let kerberos = null;

    $(".realms-op-error").prop("hidden", true);

    /* If in an operation first time cancel is clicked, cancel operation */
    $(".realms-op-cancel").on("click", function() {
        if (!cancel())
            $(dialog).prop('hidden', true);
    });

    /* When we're hidden some other way, cancel any operations */
    $(dialog).on("hide", function() {
        cancel();
    });

    $(".realms-op-apply").on("click", perform);
    $(".realms-op-leave").on("click", perform);
    $(".realms-op-field")
            .on("keydown", function(ev) {
                if (ev.which == 13)
                    perform();
            });

    $(dialog).on("click", ".realms-op-more-diagnostics", function() {
        $(".realms-op-error").prop("hidden", true);
        $(".realms-op-diagnostics").prop("hidden", false);
    });

    let timeout = null;
    $("#realms-op-address").on("keyup change", function() {
        if ($("#realms-op-address").val() != checked) {
            $(".realms-op-address-error").empty();
            $(".realms-op-address-spinner").hide();
            $("#realms-op-address").parent()
                    .removeClass("has-success has-error");
            window.clearTimeout(timeout);
            timeout = window.setTimeout(check, 1000);
        }
    });

    function hide_control(path) {
        const e = $(path);
        e.hide();
        e.prev().hide(); // hide the associated label
    }

    function show_control(path) {
        const e = $(path);
        e.show();
        e.prev().show(); // hide the associated label
    }

    let auth = null;
    function auth_changed(item) {
        auth = item.attr('data-value');
        $("#realms-op-auth span").text(item.text());
        const parts = (auth || "").split("/");
        const type = parts[0];
        const owner = parts[1];

        hide_control("#realms-op-admin");
        hide_control("#realms-op-admin-password");
        hide_control("#realms-op-user");
        hide_control("#realms-op-user-password");
        hide_control("#realms-op-ot-password");

        if (type == "password" && owner == "administrator") {
            show_control("#realms-op-admin");
            show_control("#realms-op-admin-password");
        } else if (type == "password" && owner == "user") {
            show_control("#realms-op-user");
            show_control("#realms-op-user-password");
        } else if (type == "secret") {
            show_control("#realms-op-ot-password");
        }
    }

    $("#realms-op-auth").on('click', 'li', function() {
        auth_changed($(this));
    });

    let title, label;
    if (mode == 'join') {
        title = _("page-title", _("Join a domain"));
        label = _("Join");
        $(".realms-op-join-only").show();
        $(".realms-op-leave-only-row").hide();
        $(".realms-op-apply").text(label);
        check("");
    } else {
        title = _("page-title", _("Domain"));
        $("#realms-op-info-domain").text(realm && realm.Name);
        if (realm && realm.LoginFormats && realm && realm.LoginFormats.length > 0)
            $("#realms-op-info-login-format").text(realm.LoginFormats[0].replace("%U", "username"));
        $("#realms-op-info-server-sw").text(find_detail(realm, "server-software"));
        $("#realms-op-info-client-sw").text(find_detail(realm, "client-software"));

        $("#realms-op-leave-toggle").on("click", ev => {
            if ($("#realms-op-alert").is(":visible")) {
                $("#realms-op-alert").prop("hidden", true);
                $("#realms-op-leave-caret")
                        .removeClass("fa-caret-down")
                        .addClass("fa-caret-right");
            } else {
                $("#realms-op-alert").prop("hidden", false);
                $("#realms-op-leave-caret")
                        .removeClass("fa-caret-right")
                        .addClass("fa-caret-down");
            }

            ev.preventDefault();
        });

        $(".realms-op-leave-only-row").show();
        $(".realms-op-join-only").hide();
        $(".realms-op-apply").hide();
    }

    $(".realms-op-title").text(title);
    $(".realms-op-field").val("");

    function check(name) {
        const dfd = $.Deferred();

        if (name === undefined)
            name = $("#realms-op-address").val();

        if (name) {
            $(".realms-op-address-spinner")
                    .removeClass("fa fa-check")
                    .addClass("spinner spinner-xs spinner-inline")
                    .show();
            $(".realms-op-address-error").text(_("Validating address"));
        }

        realmd.call(MANAGER, PROVIDER, "Discover", [name, { }])
                .always(function() {
                    if ($("#realms-op-address").val() != name) {
                        dfd.reject();
                        check();
                        return;
                    }

                    let error;
                    let result = [];
                    if (this.state() == "rejected") {
                        error = arguments[0];
                        $(".realms-op-message")
                                .empty()
                                .text(error.message);
                        dfd.reject(error);
                    }

                    if (arguments[0][1])
                        result = arguments[0][1];
                    const path = result[0]; /* the first realm */

                    if (!path) {
                        if (name) {
                            error_message = cockpit.format(_("Domain $0 could not be contacted"), name);
                            $(".realms-op-address-spinner").hide();
                            $(".realms-op-address-error").text(error_message);
                            $("#realms-op-address").parent()
                                    .removeClass("has-success")
                                    .addClass("has-error");
                        }

                        realm = null;
                        kerberos_membership = null;
                        kerberos = null;

                        dfd.reject(new Error(error_message));
                    } else {
                        kerberos_membership = realmd.proxy(KERBEROS_MEMBERSHIP, path);
                        $(kerberos_membership).on("changed", update);

                        kerberos = realmd.proxy(KERBEROS, path);

                        realm = realmd.proxy(REALM, path);
                        $(realm).on("changed", update);
                        realm.wait(function() {
                            dfd.resolve(realm);
                        });
                    }

                    update();
                });

        checking = dfd.promise();
        checked = name;
        return checking;
    }

    function ensure() {
        if (mode != 'join') {
            const dfd = $.Deferred();
            dfd.resolve(realm);
            return dfd.promise();
        }

        if ($("#realms-op-address").val() === checked) {
            if (checking)
                return checking;
        }

        return check();
    }

    /*
     * The realmd dbus interface has an a(ss) Details
     * property. Lookup the right value for the given
     * field key.
     */
    function find_detail(realm, field) {
        let result = null;
        if (realm && realm.Details) {
            realm.Details.forEach(function(value) {
                if (value[0] === field)
                    result = value[1];
            });
        }
        return result;
    }

    function update() {
        if (operation)
            $(".realms-op-apply").addClass("pf-m-in-progress");
        else
            $(".realms-op-apply").removeClass("pf-m-in-progress");
        $(".realms-op-spinner").toggle(!!operation);
        $(".realms-op-wait-message").toggle(!!operation);
        $(".realms-op-field").prop('disabled', !!operation);
        $(".realms-op-apply").prop('disabled', !!operation);
        $(".realm-active-directory-only").hide();

        const server = find_detail(realm, "server-software");

        if (realm && kerberos_membership) {
            if (kerberos_membership.valid) {
                $(".realms-op-address-spinner")
                        .removeClass("spinner spinner-xs spinner-inline")
                        .addClass("fa fa-check")
                        .show();
                $(".realms-op-address-error").text(_("Contacted domain"));
                $("#realms-op-address").parent()
                        .removeClass("has-error")
                        .addClass("has-success");
            } else {
                const message = cockpit.format(_("Domain $0 is not supported"), realm.Name);
                $(".realms-op-address-spinner").hide();
                $(".realms-op-address-error").text(message);
                $("#realms-op-address").parent()
                        .removeClass("has-success")
                        .addClass("has-error");
            }
        }

        state.button_disabled = !!operation;
        state.dispatchEvent("changed");

        if (mode != 'join')
            return;

        $(".realm-active-directory-only").toggle(!server || server == "active-directory");

        if (realm && realm.Name && !$("#realms-op-address")[0].placeholder) {
            $("#realms-op-address")[0].placeholder = cockpit.format(_("e.g. \"$0\""), realm.Name);
        }

        let placeholder = "";
        if (kerberos_membership) {
            if (kerberos_membership.SuggestedAdministrator)
                placeholder = cockpit.format(_("e.g. \"$0\""), kerberos_membership.SuggestedAdministrator);
        }
        $("#realms-op-admin")[0].placeholder = placeholder;

        const list = $("#realms-op-auth .dropdown-menu");
        const supported = (kerberos_membership && kerberos_membership.SupportedJoinCredentials) || [];
        supported.push(["password", "administrator"]);

        let first = true;
        let count = 0;

        function add_choice(owner, type, text) {
            for (let i = 0; i < supported.length; i++) {
                if ((!owner || owner == supported[i][1]) && type == supported[i][0]) {
                    const choice = type + "/" + supported[i][1];
                    const item = $("<li>").attr("data-value", choice)
                            .append($("<a tabindex='0'>").text(text));
                    list.append(item);
                    if (first) {
                        auth_changed(item);
                        first = false;
                    }
                    count += 1;
                    break;
                }
            }
        }

        list.empty();
        add_choice('administrator', "password", _("Administrator password"));
        add_choice('user', "password", _("User password"));
        add_choice(null, "secret", _("One time password"));
        add_choice(null, "automatic", _("Automatic"));
        $("#realms-op-auth").toggle(count > 1);
        $("#realms-op-auth").prev()
                .toggle(count > 1);
        list.prop('disabled', !!operation).val(!first);
    }

    function credentials() {
        let creds;

        const parts = (auth || "").split("/");
        const type = parts[0];
        const owner = parts[1];

        if (owner == "user" && type == "password") {
            creds = [
                type, owner,
                cockpit.variant('(ss)', [$("#realms-op-user").val(), $("#realms-op-user-password").val()])
            ];
        } else if (owner == "administrator" && type == "password") {
            creds = [
                type, owner,
                cockpit.variant('(ss)', [$("#realms-op-admin").val(), $("#realms-op-admin-password").val()])
            ];
        } else if (type == "secret") {
            const secret = $("#realms-op-ot-password").val();
            creds = [
                type, owner,
                cockpit.variant('ay', cockpit.utf8_encoder().encode(secret))
            ];
        } else {
            creds = [
                "automatic", owner,
                cockpit.variant('s', "")
            ];
        }

        return creds;
    }

    // Request and install a kerberos keytab and an SSL certificate for cockpit-ws (with IPA)
    // This is opportunistic: Some realms might not use IPA, or an unsupported auth mechanism
    function install_ws_credentials() {
        // skip this on remote ssh hosts, only set up ws hosts
        if (cockpit.transport.host !== "localhost")
            return cockpit.resolve();

        const server_sw = find_detail(realm, "server-software");
        if (server_sw !== "ipa") {
            console.log("installing ws credentials not supported for server software", server_sw);
            return cockpit.resolve();
        }

        if (auth !== "password/administrator") {
            console.log("Installing kerberos keytab and SSL certificate not supported for auth mode", auth);
            return cockpit.resolve();
        }

        const user = $("#realms-op-admin").val();
        const password = $("#realms-op-admin-password").val();
        const helper = cockpit.manifests.system.libexecdir + "/cockpit-certificate-helper";

        const proc = cockpit.spawn([helper, "ipa", "request", kerberos.RealmName, user],
                                   { superuser: "require", err: "message" });
        proc.input(password);
        return proc;
    }

    // Remove SPN from cockpit-ws keytab and SSL cert
    function cleanup_ws_credentials() {
        // skip this on remote ssh hosts, only set up ws hosts
        if (cockpit.transport.host !== "localhost")
            return cockpit.resolve();

        const dfd = cockpit.defer();

        kerberos = realmd.proxy(KERBEROS, realm.path);
        kerberos.wait()
                .done(function() {
                    const helper = cockpit.manifests.system.libexecdir + "/cockpit-certificate-helper";
                    cockpit.spawn([helper, "ipa", "cleanup", kerberos.RealmName],
                                  { superuser: "require", err: "message" })
                            .done(dfd.resolve)
                            .fail(function(ex) {
                                console.log("Failed to clean up SPN from /etc/cockpit/krb5.keytab:", JSON.stringify(ex));
                                dfd.resolve();
                            });
                })
                .fail(dfd.resolve); // no Kerberos domain? nevermind then

        return dfd.promise();
    }

    let unique = 1;

    function perform() {
        const id = "cockpit-" + unique;
        unique += 1;
        busy(id);
        $(".realms-op-error").prop("hidden", true);
        $(".realms-op-cancel").prop('disabled', true);

        ensure()
                .fail(function() {
                    $(".realms-op-cancel").prop('disabled', false);
                    busy(null);
                })
                .done(function(realm) {
                    const options = { operation: cockpit.variant('s', id) };

                    $(".realms-op-message").empty();
                    $(".realms-op-diagnostics").empty()
                            .prop("hidden", true);

                    let diagnostics = "";
                    const sub = realmd.subscribe({ member: "Diagnostics" }, function(path, iface, signal, args) {
                        if (args[1] === id) {
                            diagnostics += args[0];
                        }
                    });

                    let call;
                    if (mode == 'join') {
                        const computer_ou = $(".realms-join-computer-ou").val();
                        if (computer_ou)
                            options["computer-ou"] = cockpit.variant('s', computer_ou);
                        if (kerberos_membership.valid) {
                            call = kerberos_membership.call("Join", [credentials(), options]).then(install_ws_credentials);
                        } else {
                            busy(null);
                            $(".realms-op-message").empty()
                                    .text(_("Joining this domain is not supported"));
                            $(".realms-op-error").prop("hidden", false);
                        }
                    } else if (mode == 'leave') {
                        call = cleanup_ws_credentials().then(function() { realm.Deconfigure(options) });
                    }

                    if (!call) {
                        sub.remove();
                        $(".realms-op-cancel").prop('disabled', false);
                        return;
                    }

                    call
                            .fail(function(ex) {
                                busy(null);
                                if (ex.name == "org.freedesktop.realmd.Error.Cancelled") {
                                    $(dialog).prop('hidden', true);
                                } else {
                                    console.log("Failed to " + mode + " domain: " + realm.Name + ": " + ex);
                                    $(".realms-op-message").empty()
                                            .text(ex + " ");
                                    $(".realms-op-error").prop("hidden", false);
                                    if (diagnostics) {
                                        $(".realms-op-message")
                                                .append('<a tabindex="0" class="realms-op-more-diagnostics">' + _("More") + '</a>');
                                        $(".realms-op-diagnostics").text(diagnostics);
                                    }
                                }
                            })
                            .done(function() {
                                busy(null);
                                $(dialog).prop('hidden', true);
                            })
                            .always(function() {
                                sub.remove();
                                $(".realms-op-cancel").prop('disabled', false);
                            });
                });
    }

    function busy(id) {
        operation = id;
        update();
    }

    function cancel() {
        if (operation) {
            realmd.call(MANAGER, SERVICE, "Cancel", [operation]);
            busy(null);
            return true;
        }
        return false;
    }

    update();
    return dialog;
}

export function setup() {
    const $ = jQuery;

    const self = {
        button_text: "",
        button_tooltip: null,
        button_disabled: false,
        hostname_button_tooltip: null,
        hostname_button_disabled: false,

        clicked: handle_link_click
    };

    cockpit.event_target(self);

    let realmd = null;
    let realms = null;

    /* The realm we are joined to */
    let joined = null;

    let install_realmd = false;

    function update_realms() {
        joined = [];
        for (const path in realms) {
            const realm = realms[path];
            if (realm.Configured)
                joined.push(realm);
        }

        let text;
        if (!joined || !joined.length) {
            text = _("Join domain");
            self.hostname_button_disabled = false;
            self.hostname_button_tooltip = null;
        } else {
            text = joined.map(function(x) { return x.Name }).join(", ");
            self.hostname_button_disabled = true;
            self.hostname_button_tooltip = _("Host name should not be changed in a domain");
        }
        self.button_text = text;
        self.button_disabled = false;
        self.button_tooltip = null;
        self.dispatchEvent("changed");
    }

    function setup_realms_proxy() {
        if (realmd) {
            $(realmd).off();
            realmd.close();
        }

        // HACK: need to reinitialize after installing realmd (https://github.com/cockpit-project/cockpit/pull/9125)
        realmd = cockpit.dbus("org.freedesktop.realmd", { superuser: "try" });
        realmd.watch(MANAGER);

        $(realmd).on("close", function(ev, options) {
            if (options.problem == "not-found") {
                /* see if we can install it */
                packagekit.detect().then(function (exists) {
                    if (exists) {
                        self.button_tooltip = _("Joining a domain requires installation of realmd");
                        self.button_disabled = false;
                        install_realmd = true;
                        self.dispatchEvent("changed");
                    } else {
                        self.button_tooltip = _("Cannot join a domain because realmd is not available on this system");
                        self.button_disabled = true;
                        self.dispatchEvent("changed");
                    }
                });
            } else {
                self.button_tooltip = cockpit.message(options);
                self.button_disabled = true;
                self.dispatchEvent("changed");
            }
            $(realmd).off();
            realmd.close();
            realmd = null;
        });

        realms = realmd.proxies("org.freedesktop.realmd.Realm");
        $(realms).on("changed", update_realms);
    }

    function handle_install_realmd() {
        install_dialog("realmd")
                .then(function() {
                    install_realmd = false;
                    setup_realms_proxy();
                    self.button_tooltip = null;
                    self.dispatchEvent("changed");
                    // proceed to domain join dialog after realmd initialized
                    realms.wait().done(handle_link_click);
                })
                .catch(function() { }); // dialog cancelled
    }

    let dialog = null;
    function handle_link_click() {
        if (dialog)
            $(dialog).remove();

        if (install_realmd) {
            handle_install_realmd();
            return;
        }

        if (joined && joined.length)
            dialog = instance(realmd, 'leave', joined[0], self);
        else
            dialog = instance(realmd, 'join', null, self);

        $(dialog)
                .attr("id", "realms-op")
                .appendTo("body")
                .prop('hidden', false);
        cockpit.translate();
    }

    setup_realms_proxy();
    update_realms();

    superuser.addEventListener("changed", setup_realms_proxy);

    self.close = function close() {
        if (dialog)
            dialog.cancel();
        if (realmd)
            realmd.close();
    };

    return self;
}
