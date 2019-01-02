import React from 'react';
import { withI18n } from 'react-i18next';
import { NavLink, withRouter } from 'react-router-dom';
import { observable } from 'mobx';
import { observer } from 'mobx-react';
import { Table, TableHead, TableBody, Input } from 'mdbreact';
import { action } from 'mobx/lib/mobx';
import { GroupsService } from '../../services/groups';
import { TableSummery } from '../controls/TableSummery';

@observer
class BaseDGSGroupsTable extends React.Component {

    groupsService = new GroupsService();

    @observable
    query = '';

    get TRANSLATE_PREFIX() {
        const {match} = this.props;
        return `${match.params.groupType}:allocations.dgsAdmin.table`;
    }

    constructor(params) {
        super(params);
    }

    @action
    handleChange = (e) => {
        this.query = e.target.value;
    };

    filter = (member) => {
        if (!this.query || !this.query.length) {
            // No query given - should return all camps
            return true;
        }
        return this.match(member);
    };

    match(group) {
        for (const searchProp of [
            group.camp_name_he || '',
            group.camp_name_en || '',
            group.contact_person_name || '',
            group.contact_person_email || '',
            group.contact_person_phone || ''
        ]) {
            if (searchProp.toLowerCase().includes(this.query)) {
                return true
            }
        }
        return false;
    }

    updateGroupsQuota(group, quota) {
        // TODO - should we update manually.
        group.quota = quota;
    }

    getFormerEventEntries(group) {
        if (!group || !group.former_tickets || !group.former_tickets.length) {
            return 0;
        }
        return group.former_tickets.filter(ticket => !!ticket.entrance_timestamp || !!ticket.first_entrance_timestamp).length;
    }

    get tableSums() {
        const {t, groups} = this.props;
        let membersSum = 0, ticketsSum = 0, allocatedSum = 0;
        for (const group of groups) {
            membersSum += group.members_count || 0;
            ticketsSum += (group.tickets || []).length;
            allocatedSum += group.quota || 0;
        }
        return {
            [t(`${this.TRANSLATE_PREFIX}.sums.groups`)]: groups.length,
            [t(`${this.TRANSLATE_PREFIX}.sums.members`)]: membersSum,
            [t(`${this.TRANSLATE_PREFIX}.sums.ticketsAll`)]: ticketsSum,
            [t(`${this.TRANSLATE_PREFIX}.sums.allocated`)]: allocatedSum,
        }
    }


    get CSVdata() {
        const {t, groups} = this.props;
        return groups.map(g => {
            return {
                [t(`${this.TRANSLATE_PREFIX}.groupName`)]: this.groupsService.getPropertyByLang(g, 'name'),
                [t(`${this.TRANSLATE_PREFIX}.leaderName`)]: g.contact_person_name,
                [t(`${this.TRANSLATE_PREFIX}.leaderEmail`)]: g.contact_person_email,
                [t(`${this.TRANSLATE_PREFIX}.leaderPhone`)]: g.contact_person_phone,
                [t(`${this.TRANSLATE_PREFIX}.totalMembers`)]: g.members_count,
                [t(`${this.TRANSLATE_PREFIX}.totalPurchased`)]: (g.tickets || []).length,
                [t(`${this.TRANSLATE_PREFIX}.totalEntered`)]: this.getFormerEventEntries(g),
                [t(`${this.TRANSLATE_PREFIX}.quota`)]: g.quota || 0
            };
        })
    }

    render() {
        const {t, groups} = this.props;
        return (
            <div>
                <Input
                    className="form-control"
                    type="text"
                    hint={t(`${this.TRANSLATE_PREFIX}.search`)}
                    placeholder={t(`${this.TRANSLATE_PREFIX}.search`)}
                    aria-label={t(`${this.TRANSLATE_PREFIX}.search`)}
                    value={this.query}
                    onChange={this.handleChange}
                />
                <Table hover responsive btn>
                    <TableHead>
                        <tr>
                            <th>{t(`${this.TRANSLATE_PREFIX}.groupName`)}</th>
                            <th>{t(`${this.TRANSLATE_PREFIX}.leaderName`)}</th>
                            <th>{t(`${this.TRANSLATE_PREFIX}.leaderEmail`)}</th>
                            <th>{t(`${this.TRANSLATE_PREFIX}.leaderPhone`)}</th>
                            <th>{t(`${this.TRANSLATE_PREFIX}.totalMembers`)}</th>
                            <th>{t(`${this.TRANSLATE_PREFIX}.totalPurchased`)}</th>
                            <th>{t(`${this.TRANSLATE_PREFIX}.totalEntered`)}</th>
                            <th>{t(`${this.TRANSLATE_PREFIX}.quota`)}</th>
                        </tr>
                    </TableHead>
                    <TableBody>
                        {groups.filter(this.filter).map(g => {
                            return (
                                <tr key={g.id}>
                                    <td>
                                        <NavLink
                                            to={`${g.id}`}>{this.groupsService.getPropertyByLang(g, 'name')}</NavLink>
                                    </td>
                                    <td>
                                        {g.contact_person_name}
                                    </td>
                                    <td>
                                        {g.contact_person_email}
                                    </td>
                                    <td>
                                        {g.contact_person_phone}
                                    </td>
                                    <td>
                                        {g.members_count}
                                    </td>
                                    <td>
                                        {(g.tickets || []).length}
                                    </td>
                                    <td>
                                        {this.getFormerEventEntries(g)}
                                    </td>
                                    <td>
                                        <Input
                                            type="number"
                                            hint={t(`${this.TRANSLATE_PREFIX}.noQuota`)}
                                            placeholder={t(`${this.TRANSLATE_PREFIX}.noQuota`)}
                                            aria-label={t(`${this.TRANSLATE_PREFIX}.noQuota`)}
                                            value={g.quota || ''}
                                            onChange={(e) => this.updateGroupsQuota(g, e.target.value)}/>
                                    </td>
                                </tr>
                            );
                        })}
                    </TableBody>
                </Table>
                <TableSummery csvName={`GroupsAllocationSummery - ${(new Date).toDateString()}.csv`}
                              sums={this.tableSums} csvData={this.CSVdata}/>
            </div>
        );
    }
}

export const DGSGroupsTable = withRouter(withI18n()(BaseDGSGroupsTable));
