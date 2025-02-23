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

import React from "react";
import {
    Button,
    DescriptionList,
    DescriptionListTerm,
    DescriptionListGroup,
    DescriptionListDescription
} from "@patternfly/react-core";

import cockpit from "cockpit";
import * as utils from "./utils.js";

const _ = cockpit.gettext;

export class PVolTab extends React.Component {
    render() {
        const block_pvol = this.props.client.blocks_pvol[this.props.block.path];
        const vgroup = block_pvol && this.props.client.vgroups[block_pvol.VolumeGroup];

        return (
            <DescriptionList className="pf-m-horizontal-on-sm">
                <DescriptionListGroup>
                    <DescriptionListTerm>{_("Volume group")}</DescriptionListTerm>
                    <DescriptionListDescription>{vgroup
                        ? <Button variant="link" isInline role="link" onClick={() => cockpit.location.go(["vg", vgroup.Name])}>
                            {vgroup.Name}
                        </Button>
                        : "-"
                    }
                    </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                    <DescriptionListTerm>{_("Free")}</DescriptionListTerm>
                    <DescriptionListDescription>{block_pvol ? utils.fmt_size(block_pvol.FreeSize) : "-"}</DescriptionListDescription>
                </DescriptionListGroup>
            </DescriptionList>
        );
    }
}

export class MDRaidMemberTab extends React.Component {
    render() {
        const mdraid = this.props.client.mdraids[this.props.block.MDRaidMember];

        return (
            <DescriptionList className="pf-m-horizontal-on-sm">
                <DescriptionListGroup>
                    <DescriptionListTerm>{_("RAID device")}</DescriptionListTerm>
                    <DescriptionListDescription>{mdraid
                        ? <Button variant="link" isInline role="link" onClick={() => cockpit.location.go(["mdraid", mdraid.UUID])}>
                            {utils.mdraid_name(mdraid)}
                        </Button>
                        : "-"
                    }
                    </DescriptionListDescription>
                </DescriptionListGroup>
            </DescriptionList>
        );
    }
}

export class VDOBackingTab extends React.Component {
    render() {
        const vdo = this.props.client.vdo_overlay.find_by_backing_block(this.props.block);

        return (
            <DescriptionList className="pf-m-horizontal-on-sm">
                <DescriptionListGroup>
                    <DescriptionListTerm>{_("VDO device")}</DescriptionListTerm>
                    <DescriptionListDescription>{vdo
                        ? <Button variant="link" isInline role="link" onClick={() => cockpit.location.go(["vdo", vdo.name])}>
                            {vdo.name}
                        </Button>
                        : "-"
                    }
                    </DescriptionListDescription>
                </DescriptionListGroup>
            </DescriptionList>
        );
    }
}
