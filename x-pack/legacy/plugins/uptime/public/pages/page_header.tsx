/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiTitle, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { useRouteMatch, useParams } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { UptimeDatePicker } from '../components/functional/uptime_date_picker';
import { AppState } from '../state';
import { selectSelectedMonitor } from '../state/selectors';
import { getMonitorPageBreadcrumb, getOverviewPageBreadcrumbs } from '../breadcrumbs';
import { stringifyUrlParams } from '../lib/helper/stringify_url_params';
import { getTitle } from '../lib/helper/get_title';
import { UMUpdateBreadcrumbs } from '../lib/lib';
import { MONITOR_ROUTE } from '../routes';

interface PageHeaderProps {
  monitorStatus?: any;
  setBreadcrumbs: UMUpdateBreadcrumbs;
}

export const PageHeaderComponent = ({ monitorStatus, setBreadcrumbs }: PageHeaderProps) => {
  const monitorPage = useRouteMatch({
    path: MONITOR_ROUTE,
  });

  const { absoluteDateRangeStart, absoluteDateRangeEnd, ...params } = useParams();

  const headingText = i18n.translate('xpack.uptime.overviewPage.headerText', {
    defaultMessage: 'Overview',
    description: `The text that will be displayed in the app's heading when the Overview page loads.`,
  });

  const [headerText, setHeaderText] = useState(headingText);

  useEffect(() => {
    if (monitorPage) {
      setHeaderText(monitorStatus?.url?.full);
      if (monitorStatus?.monitor) {
        const { name, id } = monitorStatus.monitor;
        document.title = getTitle(name || id);
      }
    } else {
      document.title = getTitle();
    }
  }, [monitorStatus, monitorPage, setHeaderText]);

  useEffect(() => {
    if (monitorPage) {
      if (headerText) {
        setBreadcrumbs(getMonitorPageBreadcrumb(headerText, stringifyUrlParams(params)));
      }
    } else {
      setBreadcrumbs(getOverviewPageBreadcrumbs());
    }
  }, [headerText, setBreadcrumbs, params, monitorPage]);

  useEffect(() => {
    document.title = getTitle();
  }, []);

  return (
    <>
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s">
        <EuiFlexItem>
          <EuiTitle>
            <h1>{headerText}</h1>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <UptimeDatePicker />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
    </>
  );
};

const mapStateToProps = (state: AppState) => ({
  monitorStatus: selectSelectedMonitor(state),
});

export const PageHeader = connect(mapStateToProps, null)(PageHeaderComponent);
