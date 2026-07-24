import { useShallow } from "zustand/shallow"
import { useStorageStore } from "../stores/storage"
import { Button, Spin, Switch } from "antd"
import { LoadingOutlined } from '@ant-design/icons'
import { ConfigDesc, ConfigItemX } from "../config/item"
import { useTranslation } from "react-i18next"
import TipIcon from "@/components/data/tip-icon"
import { sendToBackground } from "@/utils/message"
import { useState } from "react"

export const IpModulePanel = ({ }: {}) => {
  const [t] = useTranslation()
  const [currentInfo, setCurrentInfo] = useState<LocalStorageConfig['input']['ipInfo']>()

  const { config, saveConfig, saveConfigAsync, reloadConfig } = useStorageStore(useShallow((s) => ({
    version: s.version,
    config: s.config,
    saveConfig: s.saveConfig,
    saveConfigAsync: s.saveConfigAsync,
    reloadConfig: s.reloadConfig,
  })))
  const action = config?.action.ipInfo;
  const input = currentInfo ?? config?.input.ipInfo;

  const changeEnable = async (checked: boolean) => {
    if (!action) return;
    action.enable = checked;
    await saveConfigAsync();
    await reIpInfo();
  }

  const reIpInfo = async () => {
    const info = await sendToBackground({
      type: 'ip.refresh',
    })
    setCurrentInfo(info)
    setTimeout(() => {
      reloadConfig();
    }, 1000)
  }

  return config && action ? <div key={String(!!config)}>
    <div className="p-1 flex items-center justify-between">
      <div>
        <span className="font-bold">IP 模块</span>
        <p className="text-default-500">开启后，将根据当前 IP 地址自动配置相关参数</p>
      </div>
      <Switch
        className="[&_.ant-switch-inner>span]:font-bold"
        checked={action.enable}
        onChange={changeEnable}
      />
    </div>

    <hr className="my-2 text-default-200" />

    <div>
      <div className="ms-1 mb-2 font-bold">当前 IP 信息</div>
      <div className="p-1 bg-[--ant-color-bg-container] rounded-lg">
        <table className="border-separate border-spacing-x-4">
          <tbody className="[&_td:first-child]:text-end [&_td:last-child]:text-start">
            <tr>
              <td>IP 地址</td>
              <td>{input?.ip ?? '--'}</td>
            </tr>
            <tr>
              <td>国家代码</td>
              <td>{input?.countryCode ?? '--'}</td>
            </tr>
            <tr>
              <td>时区</td>
              <td>{input?.timezone ?? '--'}</td>
            </tr>
            <tr>
              <td>语言</td>
              <td>{input?.languages?.join(', ') ?? '--'}</td>
            </tr>
            <tr>
              <td>获取时间</td>
              <td>{input?.createdAt ? new Date(input.createdAt).toLocaleString() : '--'}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex justify-end">
        <Button onClick={reIpInfo}>重新获取</Button>
      </div>
    </div>

    <hr className="my-2 text-default-200" />

    <div>
      <div className="ms-1 mb-2 font-bold">配置</div>

      <div className="p-1 bg-[--ant-color-bg-container] rounded-lg">
        <ConfigItemX
          label={t('item.title.ip-module.enable-languages')}
          endContent={<TipIcon.Question content={<ConfigDesc desc={t('item.desc.ip-module.enable-languages')} />} />}
        >
          <Switch
            className="[&_.ant-switch-inner>span]:font-bold"
            checked={action.enableLanguages}
            onChange={(checked) => {
              if (action.enableLanguages !== checked) {
                action.enableLanguages = checked
                saveConfig()
              }
            }}
          />
        </ConfigItemX>

        <ConfigItemX
          label={t('item.title.ip-module.enable-timezone')}
          endContent={<TipIcon.Question content={<ConfigDesc desc={t('item.desc.ip-module.enable-timezone')} />} />}
        >
          <Switch
            className="[&_.ant-switch-inner>span]:font-bold"
            checked={action.enableTimezone}
            onChange={(checked) => {
              if (action.enableTimezone !== checked) {
                action.enableTimezone = checked
                saveConfig()
              }
            }}
          />
        </ConfigItemX>
      </div>
    </div>

  </div> : <Spin indicator={<LoadingOutlined spin />} />
}