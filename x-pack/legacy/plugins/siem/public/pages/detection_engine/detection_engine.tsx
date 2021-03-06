/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiSpacer, EuiTab, EuiTabs } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { StickyContainer } from 'react-sticky';
import { connect } from 'react-redux';
import { ActionCreator } from 'typescript-fsa';

import { Query } from '../../../../../../../src/plugins/data/common/query';
import { esFilters } from '../../../../../../../src/plugins/data/common/es_query';

import { GlobalTime } from '../../containers/global_time';
import { indicesExistOrDataTemporarilyUnavailable, WithSource } from '../../containers/source';
import { AlertsTable } from '../../components/alerts_viewer/alerts_table';
import { FiltersGlobal } from '../../components/filters_global';
import { DETECTION_ENGINE_PAGE_NAME } from '../../components/link_to/redirect_to_detection_engine';
import { SiemSearchBar } from '../../components/search_bar';
import { WrapperPage } from '../../components/wrapper_page';
import { State } from '../../store';
import { inputsSelectors } from '../../store/inputs';
import { setAbsoluteRangeDatePicker as dispatchSetAbsoluteRangeDatePicker } from '../../store/inputs/actions';
import { SpyRoute } from '../../utils/route/spy_routes';
import { InputsModelId } from '../../store/inputs/constants';
import { InputsRange } from '../../store/inputs/model';
import { AlertsByCategory } from '../overview/alerts_by_category';
import { useSignalInfo } from './components/signals_info';
import { SignalsTable } from './components/signals';
import { NoWriteSignalsCallOut } from './components/no_write_signals_callout';
import { SignalsHistogramPanel } from './components/signals_histogram_panel';
import { signalsHistogramOptions } from './components/signals_histogram_panel/config';
import { useUserInfo } from './components/user_info';
import { DetectionEngineEmptyPage } from './detection_engine_empty_page';
import { DetectionEngineNoIndex } from './detection_engine_no_signal_index';
import { DetectionEngineHeaderPage } from './components/detection_engine_header_page';
import { DetectionEngineUserUnauthenticated } from './detection_engine_user_unauthenticated';
import * as i18n from './translations';
import { DetectionEngineTab } from './types';

interface ReduxProps {
  filters: esFilters.Filter[];
  query: Query;
}

export interface DispatchProps {
  setAbsoluteRangeDatePicker: ActionCreator<{
    id: InputsModelId;
    from: number;
    to: number;
  }>;
}

type DetectionEnginePageComponentProps = ReduxProps & DispatchProps;

const detectionsTabs = [
  {
    id: DetectionEngineTab.signals,
    name: i18n.SIGNAL,
    disabled: false,
  },
  {
    id: DetectionEngineTab.alerts,
    name: i18n.ALERT,
    disabled: false,
  },
];

const DetectionEnginePageComponent: React.FC<DetectionEnginePageComponentProps> = ({
  filters,
  query,
  setAbsoluteRangeDatePicker,
}) => {
  const { tabName = DetectionEngineTab.signals } = useParams();
  const {
    loading,
    isSignalIndexExists,
    isAuthenticated: isUserAuthenticated,
    canUserCRUD,
    signalIndexName,
    hasIndexWrite,
  } = useUserInfo();

  const [lastSignals] = useSignalInfo({});

  const updateDateRangeCallback = useCallback(
    (min: number, max: number) => {
      setAbsoluteRangeDatePicker({ id: 'global', from: min, to: max });
    },
    [setAbsoluteRangeDatePicker]
  );

  const tabs = useMemo(
    () => (
      <EuiTabs>
        {detectionsTabs.map(tab => (
          <EuiTab
            isSelected={tab.id === tabName}
            disabled={tab.disabled}
            key={tab.id}
            href={`#/${DETECTION_ENGINE_PAGE_NAME}/${tab.id}`}
          >
            {tab.name}
          </EuiTab>
        ))}
      </EuiTabs>
    ),
    [detectionsTabs, tabName]
  );

  if (isUserAuthenticated != null && !isUserAuthenticated && !loading) {
    return (
      <WrapperPage>
        <DetectionEngineHeaderPage border title={i18n.PAGE_TITLE} />
        <DetectionEngineUserUnauthenticated />
      </WrapperPage>
    );
  }
  if (isSignalIndexExists != null && !isSignalIndexExists && !loading) {
    return (
      <WrapperPage>
        <DetectionEngineHeaderPage border title={i18n.PAGE_TITLE} />
        <DetectionEngineNoIndex />
      </WrapperPage>
    );
  }

  return (
    <>
      {hasIndexWrite != null && !hasIndexWrite && <NoWriteSignalsCallOut />}
      <WithSource sourceId="default">
        {({ indicesExist, indexPattern }) => {
          return indicesExistOrDataTemporarilyUnavailable(indicesExist) ? (
            <StickyContainer>
              <FiltersGlobal>
                <SiemSearchBar id="global" indexPattern={indexPattern} />
              </FiltersGlobal>
              <WrapperPage>
                <DetectionEngineHeaderPage
                  subtitle={
                    lastSignals != null && (
                      <>
                        {i18n.LAST_SIGNAL}
                        {': '}
                        {lastSignals}
                      </>
                    )
                  }
                  title={i18n.PAGE_TITLE}
                >
                  <EuiButton fill href="#/detections/rules" iconType="gear">
                    {i18n.BUTTON_MANAGE_RULES}
                  </EuiButton>
                </DetectionEngineHeaderPage>

                <GlobalTime>
                  {({ to, from, deleteQuery, setQuery }) => (
                    <>
                      {tabs}
                      <EuiSpacer />
                      {tabName === DetectionEngineTab.signals && (
                        <>
                          <SignalsHistogramPanel
                            filters={filters}
                            from={from}
                            loadingInitial={loading}
                            query={query}
                            stackByOptions={signalsHistogramOptions}
                            to={to}
                            updateDateRange={updateDateRangeCallback}
                          />
                          <EuiSpacer size="l" />
                          <SignalsTable
                            loading={loading}
                            hasIndexWrite={hasIndexWrite ?? false}
                            canUserCRUD={canUserCRUD ?? false}
                            from={from}
                            signalsIndex={signalIndexName ?? ''}
                            to={to}
                          />
                        </>
                      )}
                      {tabName === DetectionEngineTab.alerts && (
                        <>
                          <AlertsByCategory
                            deleteQuery={deleteQuery}
                            filters={filters}
                            from={from}
                            hideHeaderChildren={true}
                            indexPattern={indexPattern}
                            query={query}
                            setAbsoluteRangeDatePicker={setAbsoluteRangeDatePicker!}
                            setQuery={setQuery}
                            to={to}
                          />
                          <EuiSpacer size="l" />
                          <AlertsTable endDate={to} startDate={from} />
                        </>
                      )}
                    </>
                  )}
                </GlobalTime>
              </WrapperPage>
            </StickyContainer>
          ) : (
            <WrapperPage>
              <DetectionEngineHeaderPage border title={i18n.PAGE_TITLE} />
              <DetectionEngineEmptyPage />
            </WrapperPage>
          );
        }}
      </WithSource>
      <SpyRoute />
    </>
  );
};

const makeMapStateToProps = () => {
  const getGlobalInputs = inputsSelectors.globalSelector();
  return (state: State) => {
    const globalInputs: InputsRange = getGlobalInputs(state);
    const { query, filters } = globalInputs;

    return {
      query,
      filters,
    };
  };
};

const mapDispatchToProps = {
  setAbsoluteRangeDatePicker: dispatchSetAbsoluteRangeDatePicker,
};

export const DetectionEnginePage = connect(
  makeMapStateToProps,
  mapDispatchToProps
)(React.memo(DetectionEnginePageComponent));
