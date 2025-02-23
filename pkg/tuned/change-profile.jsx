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
import React from "react";
import PropTypes from "prop-types";

import { Label, Split, SplitItem } from '@patternfly/react-core';

const _ = cockpit.gettext;

/* Performance profile entry
 * Expected props:
 *  - name (key)
 *  - recommended (boolean)
 *  - selected (boolean)
 *  - title
 *  - description
 *  - click (callback function)
 */
class TunedDialogProfile extends React.Component {
    render() {
        let classes = "list-group-item";
        let variant = "filled";

        if (this.props.selected) {
            classes += " active";
            variant = "outline";
        }

        return (
            <button className={ classes } key={ this.props.name } onClick={ this.props.click }>
                <Split>
                    <SplitItem isFilled>
                        <p>{ this.props.title }</p>
                        <small>{ this.props.description }</small>
                    </SplitItem>
                    <SplitItem>
                        {this.props.recommended && <Label color="blue" variant={variant}>{_("recommended")}</Label>}
                        {" "}
                        {this.props.active && <Label color="blue" variant={variant}>{_("active")}</Label>}
                    </SplitItem>
                </Split>
            </button>
        );
    }
}
TunedDialogProfile.propTypes = {
    name: PropTypes.string.isRequired,
    recommended: PropTypes.bool.isRequired,
    selected: PropTypes.bool.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    click: PropTypes.func.isRequired,
};

/* dialog body with list of performance profiles
 * Expected props:
 *  - active_profile (key of the active profile)
 *  - change_selected callback, called with profile name each time the selected entry changes
 *  - profiles (array of entries passed to TunedDialogProfile)
 *    - name (string, key)
 *    - recommended (boolean)
 *    - active (boolean)
 *    - title (string)
 *    - description (string)
 */
export class TunedDialogBody extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            selected_profile: this.props.active_profile,
        };
    }

    handleProfileClick(profile) {
        if (profile != this.state.selected_profile) {
            this.setState({ selected_profile: profile });
            this.props.change_selected(profile);
        }
    }

    render() {
        const self = this;
        const profiles = this.props.profiles.map(function(itm) {
            itm.active = (self.props.active_profile == itm.name);
            itm.selected = (self.state.selected_profile == itm.name);
            itm.click = self.handleProfileClick.bind(self, itm.name);
            return <TunedDialogProfile key={itm.name} { ...itm } />;
        });
        return (
            <div className="list-group dialog-list-ct">
                { profiles }
            </div>
        );
    }
}
TunedDialogBody.propTypes = {
    active_profile: PropTypes.string.isRequired,
    change_selected: PropTypes.func.isRequired,
    profiles: PropTypes.array.isRequired,
};
