import { IpApi } from "@/api/ip";
import { getLocalStorage, updateContext } from "./storage";
import { HookType } from '@/types/enum'
import countryLanguages from "@/data/country_languages.json"

const alarmName = "ip-auto-config"

export const reIpAutoConfigAlarm = async () => {
  const { storage } = await getLocalStorage()
  const options = storage.config?.action?.ipAutoConfig ?? {};

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

  reIpAutoConfig()
}

export const reIpAutoConfig = async () => {
  const { storage } = await getLocalStorage()

  const fp = storage.config.fp
  const ipAuto = storage.config.action.ipAutoConfig;

  let isUpdate = false
  const next = {} as DeepPartial<HookFingerprint>

  if (ipAuto.enable) {
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

    if (ipAuto.enableLanguages && languages) {
      isUpdate = true
      next.navigator = {
        languages: {
          type: HookType.value,
          value: languages,
          tag: alarmName,
        }
      }
    }

    if (ipAuto.enableTimezone && timezone && languages) {
      isUpdate = true
      next.other = {
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
  } else {
    /* Disable */
    if (ipAuto.enableLanguages
      && fp.navigator.languages.type === HookType.value
      && fp.navigator.languages.tag === alarmName
    ) {
      isUpdate = true
      next.navigator = {
        languages: {
          type: HookType.default,
        }
      }
    }

    if (ipAuto.enableTimezone
      && fp.other.timezone.type === HookType.value
      && fp.other.timezone.tag === alarmName
    ) {
      isUpdate = true
      next.other = {
        timezone: {
          type: HookType.default,
        }
      }
    }
  }

  if (isUpdate) {
    updateContext({ config: { fp: next } })
  }
}