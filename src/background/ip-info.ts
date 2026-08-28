import { IpApi } from "@/api/ip";
import { getLocalStorage, updateContext } from "./storage";
import { HookType } from '@/types/enum'
import countryLanguages from "@/data/country_languages.json"
import { sharedAsync } from "@/utils/timer";
import { logManager } from "@/utils/log";

const logger = logManager.createLogger(__LOG_PREFIX_FILE_PATH__);

const alarmName = "ip-auto-config"
const fetchIntervalMs = 1000
let lastAt = 0

/**
 * 处理 ipInfo 配置
 */
export const reIpInfoAlarm = async (prev?: DeepPartial<LocalStorage>, next?: DeepPartial<LocalStorage>) => {
  if (prev && next) {
    const nfp = next.config?.fp

    if (nfp?.navigator?.languages?.tag === alarmName || nfp?.other?.timezone?.tag === alarmName) {
      return;
    }

    const pinfo = prev.config?.action?.ipInfo
    const ninfo = next.config?.action?.ipInfo

    if (!pinfo && !ninfo) {
      return;
    }

    if (
      (!pinfo || !ninfo) ||
      pinfo.enable !== ninfo.enable ||
      pinfo.intervalMin !== ninfo.intervalMin ||
      pinfo.enableTimezone !== ninfo.enableTimezone ||
      pinfo.enableLanguages !== ninfo.enableLanguages
    ) {
      if (ninfo && ninfo.enable) {
        const interval = ninfo.intervalMin || 1;
        const alarm = await chrome.alarms.get(alarmName)

        if (!alarm || alarm.periodInMinutes !== interval) {
          await chrome.alarms.create(alarmName, {
            delayInMinutes: interval,
            periodInMinutes: interval,
          });
        }
      } else {
        await chrome.alarms.clear(alarmName)
      }
    }
  }

  reIpInfo()
}

const makeNavigatorConfig = (storage: LocalStorage, languages?: string[]) => {
  const fp = storage.config.fp
  const action = storage.config.action.ipInfo;

  if (action.enable && action.enableLanguages && languages) {
    return {
      navigator: {
        languages: {
          type: HookType.value as HookType.value,
          value: languages,
          tag: alarmName,
        }
      }
    }
  }

  if (
    (!action.enable || !action.enableLanguages)
    && fp.navigator.languages.type === HookType.value
    && fp.navigator.languages.tag === alarmName
  ) {
    return {
      navigator: {
        languages: {
          type: HookType.default as HookType.default,
        }
      }
    }
  }
}

const makeTimezoneConfig = (storage: LocalStorage, timezone?: string, languages?: string[]) => {
  const fp = storage.config.fp
  const action = storage.config.action.ipInfo;

  if (action.enable && action.enableTimezone && timezone && languages) {
    return {
      other: {
        timezone: {
          type: HookType.value as HookType.value,
          value: {
            zone: timezone,
            locales: languages,
          },
          tag: alarmName,
        }
      }
    }
  }

  if (
    (!action.enable || !action.enableTimezone)
    && fp.other.timezone.type === HookType.value
    && fp.other.timezone.tag === alarmName
  ) {
    return {
      other: {
        timezone: {
          type: HookType.default as HookType.default,
        }
      }
    }
  }
}

export const reIpInfo = sharedAsync(async (): Promise<LocalStorageConfig['input']['ipInfo']> => {
  const { storage } = await getLocalStorage()

  const ipInfoAction = storage.config.action.ipInfo;
  const ipInfoInput = storage.config.input.ipInfo;

  if (ipInfoAction.enable) {
    const now = Date.now();
    if (now - lastAt <= fetchIntervalMs) {
      return ipInfoInput;
    }
    lastAt = now;

    /* Enable */
    const ipData = await IpApi.getIp()

    let languages: string[] | undefined = undefined
    if (ipData.countryCode) {
      languages = (countryLanguages as any)[ipData.countryCode]
    }

    let timezone: string | undefined = undefined
    if (ipData.timezone) {
      timezone = ipData.timezone
    }

    const ipInfo = {
      ip: ipData.query,
      countryCode: ipData.countryCode,
      timezone: ipData.timezone,
      languages,
      createdAt: Date.now(),
    }

    console.log({
      ...makeNavigatorConfig(storage, languages),
      ...makeTimezoneConfig(storage, timezone, languages),
    });

    updateContext({
      config: {
        fp: {
          ...makeNavigatorConfig(storage, languages),
          ...makeTimezoneConfig(storage, timezone, languages),
        },
        input: {
          ipInfo,
        },
      }
    })

    logger.info("ReIpInfo Enable")

    return ipInfo;
  } else {
    /* Disable */
    const nextFp = {
      ...makeNavigatorConfig(storage),
      ...makeTimezoneConfig(storage),
    }

    if (ipInfoInput || Object.keys(nextFp).length > 0) {
      updateContext({
        config: {
          fp: nextFp,
          input: {
            ipInfo: null as any,
          },
        }
      })
    }

    logger.info("ReIpInfo Disable")

    return undefined;
  }
})