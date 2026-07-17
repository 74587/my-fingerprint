import { IpApi } from "@/api/ip";
import { getLocalStorage, updateContext } from "./storage";
import { HookType } from '@/types/enum'
import countryLanguages from "@/data/country_languages.json"

const alarmName = "ip-auto-config"

export const createIpAutoConfigAlarm = async () => {
  const { storage } = await getLocalStorage()
  if (storage.config?.action?.ipAutoConfig?.enable) {
    await chrome.alarms.create(alarmName, {
      delayInMinutes: 1,
      periodInMinutes: 1,
    });
  }
}

export const clearIpAutoConfigAlarm = async () => {
  await chrome.alarms.clear(alarmName);
}

export const executeIpAutoConfigAlarm = async () => {
  const { storage } = await getLocalStorage()

  const options = storage.config?.action?.ipAutoConfig ?? {};
  if (!options.enable) return;

  /* get data */
  const ipData = await IpApi.getIp()

  let languages: string[] | undefined = undefined
  if (ipData.countryCode) {
    languages = (countryLanguages as any)[ipData.countryCode]
  }

  let timezone: string | undefined = undefined
  if (ipData.timezone) {
    timezone = ipData.timezone
  }

  /* handle config */
  let isUpdate = false
  const fp = {} as DeepPartial<HookFingerprint>

  if (options.enableLanguages && languages) {
    fp.navigator = {
      languages: {
        type: HookType.value,
        value: languages,
      }
    }
    isUpdate = true
  }

  if (options.enableTimezone && timezone && languages) {
    fp.other = {
      timezone: {
        type: HookType.value,
        value: {
          zone: timezone,
          locales: languages,
        },
      }
    }
    isUpdate = true
  }

  if (isUpdate) {
    updateContext({ config: { fp } })
  }
}