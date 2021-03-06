/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState, useRef } from 'react';

import { useStateToaster, displaySuccessToast } from '../../../components/toasters';
import { errorToToaster } from '../../../components/ml/api/error_to_toaster';
import { getPrePackagedRulesStatus, createPrepackagedRules } from './api';
import * as i18n from './translations';

type Func = () => void;
export type CreatePreBuiltRules = () => Promise<boolean>;
interface Return {
  createPrePackagedRules: null | CreatePreBuiltRules;
  loading: boolean;
  loadingCreatePrePackagedRules: boolean;
  refetchPrePackagedRulesStatus: Func | null;
  rulesInstalled: number | null;
  rulesNotInstalled: number | null;
  rulesNotUpdated: number | null;
}

interface UsePrePackagedRuleProps {
  canUserCRUD: boolean | null;
  hasIndexWrite: boolean | null;
  hasManageApiKey: boolean | null;
  isAuthenticated: boolean | null;
  isSignalIndexExists: boolean | null;
}

/**
 * Hook for using to get status about pre-packaged Rules from the Detection Engine API
 *
 * @param hasIndexWrite boolean
 * @param hasManageApiKey boolean
 * @param isAuthenticated boolean
 * @param isSignalIndexExists boolean
 *
 */
export const usePrePackagedRules = ({
  canUserCRUD,
  hasIndexWrite,
  hasManageApiKey,
  isAuthenticated,
  isSignalIndexExists,
}: UsePrePackagedRuleProps): Return => {
  const [rulesInstalled, setRulesInstalled] = useState<number | null>(null);
  const [rulesNotInstalled, setRulesNotInstalled] = useState<number | null>(null);
  const [rulesNotUpdated, setRulesNotUpdated] = useState<number | null>(null);
  const [loadingCreatePrePackagedRules, setLoadingCreatePrePackagedRules] = useState(false);
  const [loading, setLoading] = useState(true);
  const createPrePackagedRules = useRef<null | CreatePreBuiltRules>(null);
  const refetchPrePackagedRules = useRef<Func | null>(null);
  const [, dispatchToaster] = useStateToaster();

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    const fetchPrePackagedRules = async () => {
      try {
        setLoading(true);
        const prePackagedRuleStatusResponse = await getPrePackagedRulesStatus({
          signal: abortCtrl.signal,
        });

        if (isSubscribed) {
          setRulesInstalled(prePackagedRuleStatusResponse.rules_installed);
          setRulesNotInstalled(prePackagedRuleStatusResponse.rules_not_installed);
          setRulesNotUpdated(prePackagedRuleStatusResponse.rules_not_updated);
        }
      } catch (error) {
        if (isSubscribed) {
          setRulesInstalled(null);
          setRulesNotInstalled(null);
          setRulesNotUpdated(null);
          errorToToaster({ title: i18n.RULE_FETCH_FAILURE, error, dispatchToaster });
        }
      }
      if (isSubscribed) {
        setLoading(false);
      }
    };

    const createElasticRules = async (): Promise<boolean> => {
      return new Promise(async resolve => {
        try {
          if (
            canUserCRUD &&
            hasIndexWrite &&
            hasManageApiKey &&
            isAuthenticated &&
            isSignalIndexExists
          ) {
            setLoadingCreatePrePackagedRules(true);
            await createPrepackagedRules({
              signal: abortCtrl.signal,
            });

            if (isSubscribed) {
              let iterationTryOfFetchingPrePackagedCount = 0;
              let timeoutId = -1;
              const stopTimeOut = () => {
                if (timeoutId !== -1) {
                  window.clearTimeout(timeoutId);
                }
              };
              const reFetch = () =>
                window.setTimeout(async () => {
                  iterationTryOfFetchingPrePackagedCount =
                    iterationTryOfFetchingPrePackagedCount + 1;
                  const prePackagedRuleStatusResponse = await getPrePackagedRulesStatus({
                    signal: abortCtrl.signal,
                  });
                  if (
                    isSubscribed &&
                    ((prePackagedRuleStatusResponse.rules_not_installed === 0 &&
                      prePackagedRuleStatusResponse.rules_not_updated === 0) ||
                      iterationTryOfFetchingPrePackagedCount > 100)
                  ) {
                    setLoadingCreatePrePackagedRules(false);
                    setRulesInstalled(prePackagedRuleStatusResponse.rules_installed);
                    setRulesNotInstalled(prePackagedRuleStatusResponse.rules_not_installed);
                    setRulesNotUpdated(prePackagedRuleStatusResponse.rules_not_updated);
                    displaySuccessToast(i18n.RULE_PREPACKAGED_SUCCESS, dispatchToaster);
                    stopTimeOut();
                    resolve(true);
                  } else {
                    timeoutId = reFetch();
                  }
                }, 300);
              timeoutId = reFetch();
            }
          }
        } catch (error) {
          if (isSubscribed) {
            setLoadingCreatePrePackagedRules(false);
            errorToToaster({ title: i18n.RULE_PREPACKAGED_FAILURE, error, dispatchToaster });
            resolve(false);
          }
        }
      });
    };

    fetchPrePackagedRules();
    createPrePackagedRules.current = createElasticRules;
    refetchPrePackagedRules.current = fetchPrePackagedRules;
    return () => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [canUserCRUD, hasIndexWrite, hasManageApiKey, isAuthenticated, isSignalIndexExists]);

  return {
    loading,
    loadingCreatePrePackagedRules,
    refetchPrePackagedRulesStatus: refetchPrePackagedRules.current,
    rulesInstalled,
    rulesNotInstalled,
    rulesNotUpdated,
    createPrePackagedRules: createPrePackagedRules.current,
  };
};
