import { IpApi } from "@/api/ip";
import { getLocalStorage, updateContext } from "./storage";
import { HookType } from '@/types/enum'
import countryLanguages from "@/data/country_languages.json"
import { sharedAsync } from "@/utils/timer";
import { logManager } from "@/utils/log";

const logger = logManager.createLogger(__LOG_PREFIX_FILE_PATH__);

const alarmName = "ip-auto-config"

export const reIpInfoAlarm = async () => {
  const { storage } = await getLocalStorage()
  const options = storage.config?.action?.ipInfo ?? {};

  if (options.enable) {
    const interval = options.intervalMin || 1;
    const alarm = await chrome.alarms.get(alarmName)

    if (!alarm || alarm.periodInMinutes !== interval) {
      await chrome.alarms.create(alarmName, {
        delayInMinutes: interval,
        periodInMinutes: interval,
      });
    }
  }

  reIpInfo()
}

export const reIpInfo = sharedAsync(async () => {
  const { storage } = await getLocalStorage()

  const fp = storage.config.fp
  const ipInfoAction = storage.config.action.ipInfo;
  const ipInfoInput = storage.config.input.ipInfo;

  let isUpdate = false
  const nextFp = {} as DeepPartial<HookFingerprint>
  const nextInput = {} as DeepPartial<LocalStorageConfig['input']>

  if (ipInfoAction.enable) {
    /* Enable */
    isUpdate = true
    const ipData = await IpApi.getIp()

    let languages: string[] | undefined = undefined
    if (ipData.countryCode) {
      languages = (countryLanguages as any)[ipData.countryCode]
    }

    let timezone: string | undefined = undefined
    if (ipData.timezone) {
      timezone = ipData.timezone
    }

    nextInput.ipInfo = {
      ip: ipData.query,
      countryCode: ipData.countryCode,
      timezone: ipData.timezone,
      languages,
      createdAt: Date.now(),
    }

    if (ipInfoAction.enableLanguages && languages) {
      nextFp.navigator = {
        languages: {
          type: HookType.value,
          value: languages,
          tag: alarmName,
        }
      }
    }

    if (ipInfoAction.enableTimezone && timezone && languages) {
      nextFp.other = {
        timezone: {
          type: HookType.value,
          value: {
            zone: timezone,
            locales: languages,
          },
          tag: alarmName,
        }
      }
    }

    logger.info("ReIpInfo Enable", { isUpdate, nextFp, nextInput })
  } else {
    /* Disable */
    if (ipInfoInput) {
      isUpdate = true
      nextInput.ipInfo = null as any;
    }

    if (ipInfoAction.enableLanguages
      && fp.navigator.languages.type === HookType.value
      && fp.navigator.languages.tag === alarmName
    ) {
      isUpdate = true
      nextFp.navigator = {
        languages: {
          type: HookType.default,
        }
      }
    }

    if (ipInfoAction.enableTimezone
      && fp.other.timezone.type === HookType.value
      && fp.other.timezone.tag === alarmName
    ) {
      isUpdate = true
      nextFp.other = {
        timezone: {
          type: HookType.default,
        }
      }
    }

    logger.info("ReIpInfo Disable", { isUpdate, nextFp, nextInput })
  }

  if (isUpdate) {
    updateContext({
      config: {
        fp: nextFp,
        input: nextInput,
      }
    })
  }

  return nextInput.ipInfo as LocalStorageConfig['input']['ipInfo'];
})